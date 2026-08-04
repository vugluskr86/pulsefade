import type { Rgba } from '../../config/palette';
import type { DrawCommand, IRenderer } from '../IRenderer';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';

// x,y | radius,thickness,softness,shape | r,g,b,a | rotation,arc | glow,count,param,param2
const FLOATS_PER_INSTANCE = 16;
const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4;
const MAX_PIXEL_RATIO = 2;

/** Один инстансированный quad-батч на весь кадр: сотни колец и частиц за один draw call. */
export class GLRenderer implements IRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly resolutionLocation: WebGLUniformLocation;
  private data: Float32Array;
  private capacity: number;
  private count = 0;

  width = 0;
  height = 0;
  pixelRatio = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    initialCapacity = 1024,
  ) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 недоступен в этом браузере');
    this.gl = gl;

    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    const resolution = gl.getUniformLocation(this.program, 'uResolution');
    if (!resolution) throw new Error('uResolution not found');
    this.resolutionLocation = resolution;

    this.capacity = initialCapacity;
    this.data = new Float32Array(this.capacity * FLOATS_PER_INSTANCE);

    const vao = gl.createVertexArray();
    const quadBuffer = gl.createBuffer();
    const instanceBuffer = gl.createBuffer();
    if (!vao || !quadBuffer || !instanceBuffer) throw new Error('Не удалось создать буферы GL');
    this.vao = vao;
    this.instanceBuffer = instanceBuffer;

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    this.setupInstanceAttribute(1, 2, 0);
    this.setupInstanceAttribute(2, 4, 8);
    this.setupInstanceAttribute(3, 4, 24);
    this.setupInstanceAttribute(4, 2, 40);
    this.setupInstanceAttribute(5, 4, 48);

    gl.bindVertexArray(null);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // аддитивно: пересечения светятся ярче

    this.resize();
  }

  resize(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));

    this.pixelRatio = ratio;
    this.width = width;
    this.height = height;

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.gl.viewport(0, 0, pixelWidth, pixelHeight);
  }

  beginFrame(clear: Rgba): void {
    const gl = this.gl;
    this.count = 0;
    gl.clearColor(clear[0], clear[1], clear[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  draw(command: DrawCommand): void {
    if (command.color[3] <= 0.002 || command.radius <= 0) return;
    if (this.count === this.capacity) this.grow();

    const offset = this.count * FLOATS_PER_INSTANCE;
    const data = this.data;
    data[offset] = command.x;
    data[offset + 1] = command.y;
    data[offset + 2] = command.radius;
    data[offset + 3] = command.thickness;
    data[offset + 4] = command.softness;
    data[offset + 5] = command.shape;
    data[offset + 6] = command.color[0];
    data[offset + 7] = command.color[1];
    data[offset + 8] = command.color[2];
    data[offset + 9] = command.color[3];
    data[offset + 10] = command.rotation ?? 0;
    data[offset + 11] = command.arc ?? Math.PI * 2;
    data[offset + 12] = command.glow ?? 0;
    data[offset + 13] = command.count ?? 1;
    data[offset + 14] = command.param ?? 0;
    data[offset + 15] = command.param2 ?? 0;
    this.count += 1;
  }

  endFrame(): void {
    if (this.count === 0) return;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.count * FLOATS_PER_INSTANCE);
    // Координаты команд — в CSS-пикселях, поэтому делим на pixelRatio уже здесь.
    gl.uniform2f(this.resolutionLocation, this.width, this.height);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.instanceBuffer);
  }

  private grow(): void {
    this.capacity *= 2;
    const next = new Float32Array(this.capacity * FLOATS_PER_INSTANCE);
    next.set(this.data);
    this.data = next;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, next.byteLength, gl.DYNAMIC_DRAW);
  }

  private setupInstanceAttribute(location: number, size: number, offset: number): void {
    const gl = this.gl;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, BYTES_PER_INSTANCE, offset);
    gl.vertexAttribDivisor(location, 1);
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) throw new Error('Не удалось создать программу GL');
    const vertex = this.compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = this.compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Ошибка линковки шейдера: ${gl.getProgramInfoLog(program) ?? ''}`);
    }
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return program;
  }

  private compile(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Не удалось создать шейдер');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Ошибка компиляции шейдера: ${gl.getShaderInfoLog(shader) ?? ''}`);
    }
    return shader;
  }
}
