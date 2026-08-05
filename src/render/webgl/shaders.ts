export const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 aQuad;
layout(location = 1) in vec2 iPos;
layout(location = 2) in vec4 iGeom;   // radius, thickness, softness, shape
layout(location = 3) in vec4 iColor;
layout(location = 4) in vec2 iArc;    // rotation, arc
layout(location = 5) in vec4 iExtra;  // glow, count, param, param2

uniform vec2 uResolution;

out vec2 vLocal;
out vec4 vGeom;
out vec4 vColor;
out vec2 vArc;
out vec4 vExtra;

void main() {
  // Ореол расширяет квад, иначе свечение обрезается по краю спрайта.
  float halo = max(iGeom.y * 1.5 + iGeom.z * 3.0, 3.0);
  float pad = iGeom.y * 0.5 + iGeom.z + 2.0 + (iExtra.x > 0.0 ? halo * 3.0 : 0.0);
  float extent = iGeom.x + pad;
  vec2 local = aQuad * extent;

  vLocal = local;
  vGeom = iGeom;
  vColor = iColor;
  vArc = iArc;
  vExtra = iExtra;

  vec2 pixel = iPos + local;
  vec2 clip = (pixel / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vLocal;
in vec4 vGeom;
in vec4 vColor;
in vec2 vArc;
in vec4 vExtra;

out vec4 fragColor;

const float PI = 3.14159265;
const float TAU = 6.28318531;

/** Мягкая полоса: 1 внутри половины ширины, 0 за softness от неё. */
/* halfWidth, не half: half — зарезервированное слово в GLSL ES. */
float band(float d, float halfWidth, float soft) {
  return 1.0 - smoothstep(halfWidth, halfWidth + soft, d);
}

void main() {
  float dist = length(vLocal);
  float radius = vGeom.x;
  float thickness = vGeom.y;
  float shape = vGeom.w;
  // Geometric elements use a narrow, derivative-based AA edge. Large GLOW sprites
  // deliberately keep their broad falloff, but rings/lines stay crisp on any DPI.
  float requestedSoftness = max(vGeom.z, 0.001);
  float softness = shape >= 1.5 && shape < 2.5
    ? requestedSoftness
    : max(requestedSoftness * 0.42, fwidth(dist) * 1.15);

  float rotation = vArc.x;
  float arc = vArc.y;

  float glow = vExtra.x;
  float count = max(vExtra.y, 1.0);
  float p1 = vExtra.z;
  float p2 = vExtra.w;

  float haloWidth = max(thickness * 1.1 + softness * 0.85, 1.35);
  float core = 0.0;
  float halo = 0.0;

  if (shape < 0.5) {
    // RING — неоновое кольцо: резкое ядро + экспоненциальный ореол
    float d = abs(dist - radius);
    core = band(d, thickness * 0.5, softness);
    halo = exp(-d / haloWidth);
  } else if (shape < 1.5) {
    // DISC
    core = 1.0 - smoothstep(radius - softness, radius, dist);
    halo = exp(-max(dist - radius, 0.0) / haloWidth);
  } else if (shape < 2.5) {
    // GLOW — объёмная дымка фона, p1 задаёт крутизну спада
    float t = clamp(1.0 - dist / max(radius, 0.001), 0.0, 1.0);
    core = pow(t, max(p1, 1.0));
  } else if (shape < 3.5) {
    // ARC
    float angle = atan(vLocal.y, vLocal.x) - rotation;
    angle = mod(angle + PI, TAU) - PI;
    float d = abs(dist - radius);
    float angular = band(abs(angle), arc * 0.5, 0.025 + softness / max(dist, 1.0));
    core = band(d, thickness * 0.5, softness) * angular;
    halo = exp(-d / haloWidth) * angular;
  } else if (shape < 4.5) {
    // BAR — повёрнутый прямоугольник, radius = половина длины
    float c = cos(rotation);
    float s = sin(rotation);
    vec2 p = vec2(c * vLocal.x + s * vLocal.y, -s * vLocal.x + c * vLocal.y);
    float along = band(abs(p.x), radius, softness);
    float across = band(abs(p.y), thickness * 0.5, softness);
    core = along * across;
    halo = along * exp(-max(abs(p.y) - thickness * 0.5, 0.0) / haloWidth);
  } else if (shape < 5.5) {
    // TICKS — радиальные штрихи приборной шкалы
    float a = atan(vLocal.y, vLocal.x) - rotation;
    float slot = a * count / TAU;
    float offset = (slot - floor(slot) - 0.5) * TAU / count;
    float s = offset * dist;
    float d = abs(dist - radius);
    float angular = band(abs(s), max(p1, 0.5) * 0.5, softness);
    core = band(d, thickness * 0.5, softness) * angular;
    halo = exp(-d / haloWidth) * angular;
  } else if (shape < 6.5) {
    // DASH — пунктирное кольцо, p1 — скважность
    float a = atan(vLocal.y, vLocal.x) - rotation;
    float slot = a * count / TAU;
    float offset = (slot - floor(slot) - 0.5) * TAU / count;
    float s = offset * dist;
    float dashHalf = clamp(p1, 0.05, 0.95) * PI * dist / count;
    float d = abs(dist - radius);
    float angular = band(abs(s), dashHalf, softness * 1.5);
    core = band(d, thickness * 0.5, softness) * angular;
    halo = exp(-d / haloWidth) * angular * 0.6;
  } else if (shape < 7.5) {
    // WEDGE — световой клин / панельный сектор, thickness = радиальная глубина
    float a = atan(vLocal.y, vLocal.x) - rotation;
    a = mod(a + PI, TAU) - PI;
    float inner = radius - thickness;
    float radial = smoothstep(inner - softness, inner + softness, dist) *
                   (1.0 - smoothstep(radius - softness, radius + softness, dist));
    float angSoft = max(p2, 0.015);
    float angular = 1.0 - smoothstep(arc * 0.5 - angSoft, arc * 0.5 + angSoft, abs(a));
    core = radial * angular;
    halo = radial * angular * 0.35;
  } else if (shape < 8.5) {
    // SWEEP — радарный луч: яркая передняя кромка и затухающий хвост
    float a = mod(rotation - atan(vLocal.y, vLocal.x), TAU);
    float inner = radius - thickness;
    float radial = smoothstep(inner - softness, inner + softness, dist) *
                   (1.0 - smoothstep(radius - softness, radius, dist));
    float tail = pow(clamp(1.0 - a / max(arc, 0.001), 0.0, 1.0), 1.8);
    float edge = band(min(a, TAU - a) * dist, max(p1, 1.0), softness * 2.0);
    core = radial * clamp(tail * 0.7 + edge, 0.0, 1.0);
    halo = radial * tail * 0.5;
  } else {
    // WAVE — симметричная звуковая дорожка вдоль локальной оси X
    float c = cos(rotation);
    float s = sin(rotation);
    vec2 p = vec2(c * vLocal.x + s * vLocal.y, -s * vLocal.x + c * vLocal.y);
    float env = (1.0 - smoothstep(radius * 0.35, radius, abs(p.x)));
    float f = max(p1, 0.0001);
    float w = sin(p.x * f + p2) * 0.6 +
              sin(p.x * f * 2.31 - p2 * 1.7) * 0.28 +
              sin(p.x * f * 4.93 + p2 * 0.6) * 0.18;
    float h = abs(w) * thickness * env + softness;
    core = band(abs(p.y), h, softness) * env;
    halo = exp(-max(abs(p.y) - h, 0.0) / haloWidth) * env;
  }

  // Tighten the light core without making the sub-pixel anti-aliasing jagged.
  if (!(shape >= 1.5 && shape < 2.5)) core = smoothstep(0.10, 0.82, core);
  float alpha = clamp(core + halo * glow, 0.0, 1.0) * vColor.a;
  if (alpha <= 0.002) discard;

  // Ядро яркого штриха выбеливается — так неон читается как источник света.
  float white = clamp(glow * 0.2, 0.0, 0.42) * core;
  vec3 rgb = mix(vColor.rgb, vec3(1.0), white);

  // аддитивный премультиплай — пересечения складываются и светятся ярче
  fragColor = vec4(rgb * alpha, alpha);
}`;
