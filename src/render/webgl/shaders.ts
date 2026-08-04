export const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 aQuad;
layout(location = 1) in vec2 iPos;
layout(location = 2) in vec4 iGeom;   // radius, thickness, softness, shape
layout(location = 3) in vec4 iColor;
layout(location = 4) in vec2 iArc;

uniform vec2 uResolution;

out vec2 vLocal;
out vec4 vGeom;
out vec4 vColor;
out vec2 vArc;

void main() {
  float pad = iGeom.y * 0.5 + iGeom.z + 2.0;
  float extent = iGeom.x + pad;
  vec2 local = aQuad * extent;

  vLocal = local;
  vGeom = iGeom;
  vColor = iColor;
  vArc = iArc;

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

out vec4 fragColor;

void main() {
  float dist = length(vLocal);
  float radius = vGeom.x;
  float thickness = vGeom.y;
  float softness = max(vGeom.z, 0.75);
  float shape = vGeom.w;

  float alpha;
  if (shape < 0.5) {
    // кольцо
    alpha = 1.0 - smoothstep(thickness * 0.5, thickness * 0.5 + softness, abs(dist - radius));
  } else if (shape < 1.5) {
    // диск
    alpha = 1.0 - smoothstep(radius - softness, radius, dist);
  } else if (shape < 2.5) {
    // мягкое свечение
    float t = clamp(1.0 - dist / max(radius, 0.001), 0.0, 1.0);
    alpha = t * t * t;
  } else if (shape < 3.5) {
    float angle = atan(vLocal.y, vLocal.x) - vArc.x;
    angle = mod(angle + 3.14159265, 6.2831853) - 3.14159265;
    float radial = 1.0 - smoothstep(thickness * 0.5, thickness * 0.5 + softness, abs(dist - radius));
    float angular = 1.0 - smoothstep(vArc.y * 0.5, vArc.y * 0.5 + 0.025, abs(angle));
    alpha = radial * angular;
  } else {
    float c = cos(vArc.x);
    float s = sin(vArc.x);
    vec2 local = vec2(c * vLocal.x + s * vLocal.y, -s * vLocal.x + c * vLocal.y);
    float along = 1.0 - smoothstep(radius, radius + softness, abs(local.x));
    float across = 1.0 - smoothstep(thickness * 0.5, thickness * 0.5 + softness, abs(local.y));
    alpha = along * across;
  }

  alpha *= vColor.a;
  if (alpha <= 0.002) discard;

  // аддитивный премультиплай — свечение складывается на тёмном фоне
  fragColor = vec4(vColor.rgb * alpha, alpha);
}`;
