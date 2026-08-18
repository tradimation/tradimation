import type { MeshBase, MeshPoint } from "../types.js";

export class ConnectedTextureSurface {
  readonly canvas: HTMLCanvasElement;
  base: MeshBase = { x: 0, y: 0, w: 0, h: 0 };

  private readonly gl: WebGLRenderingContext;
  private readonly cols = 32;
  private readonly rows = 14;
  private readonly program: WebGLProgram;
  private readonly positionBuffer: WebGLBuffer;
  private readonly uvBuffer: WebGLBuffer;
  private readonly indexBuffer: WebGLBuffer;
  private readonly texture: WebGLTexture;
  private readonly indices: Uint16Array;
  private width = 0;
  private height = 0;

  constructor(
    private readonly target: HTMLElement,
    private readonly overlayRoot: HTMLElement = target.ownerDocument.body,
  ) {
    this.canvas = target.ownerDocument.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646;";
    const gl = this.canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) throw new Error("Tradimation connected-texture effects require WebGL");
    this.gl = gl;
    this.program = this.createProgram();
    const positionBuffer = gl.createBuffer();
    const uvBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!positionBuffer || !uvBuffer || !indexBuffer || !texture) throw new Error("Unable to allocate WebGL resources");
    this.positionBuffer = positionBuffer;
    this.uvBuffer = uvBuffer;
    this.indexBuffer = indexBuffer;
    this.texture = texture;
    this.indices = this.buildGrid();
  }

  async capture(): Promise<void> {
    if (!this.canvas.isConnected) this.overlayRoot.append(this.canvas);
    this.resize();
    const rect = this.target.getBoundingClientRect();
    const padding = 12;
    const textureWidth = rect.width + padding * 2;
    const textureHeight = rect.height + padding * 2;
    this.base = { x: rect.left - padding, y: rect.top - padding, w: textureWidth, h: textureHeight };

    const computed = getComputedStyle(this.target);
    const clone = this.target.cloneNode(true) as HTMLElement;
    const sourceChildren = [...this.target.querySelectorAll<HTMLElement>("*")];
    const cloneChildren = [...clone.querySelectorAll<HTMLElement>("*")];
    sourceChildren.forEach((source, index) => {
      const cloneChild = cloneChildren[index];
      if (!cloneChild) return;
      const styles = getComputedStyle(source);
      cloneChild.style.cssText = [...styles].map((name) => `${name}:${styles.getPropertyValue(name)};`).join("");
    });

    const renderScale = Math.min(3, Math.max(2, (devicePixelRatio || 1) * 1.5));
    const body = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${textureWidth}px;height:${textureHeight}px;padding:${padding}px;box-sizing:border-box;"><div style="width:${rect.width}px;height:${rect.height}px;display:grid;place-items:center;box-sizing:border-box;border:${computed.border};border-radius:${computed.borderRadius};background:${computed.backgroundColor};box-shadow:${computed.boxShadow};color:${computed.color};font-family:${computed.fontFamily};">${clone.innerHTML}</div></div>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${textureWidth * renderScale}" height="${textureHeight * renderScale}" viewBox="0 0 ${textureWidth} ${textureHeight}"><foreignObject width="100%" height="100%">${body}</foreignObject></svg>`;
    const image = new Image();
    image.decoding = "async";
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  draw(mapper: (u: number, v: number, base: MeshBase) => MeshPoint): void {
    const positions: number[] = [];
    for (let row = 0; row <= this.rows; row += 1) {
      for (let col = 0; col <= this.cols; col += 1) {
        const u = col / this.cols;
        const v = row / this.rows;
        const point = mapper(u, v, this.base);
        positions.push((point.x / this.width) * 2 - 1, 1 - (point.y / this.height) * 2);
      }
    }

    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    const positionLocation = gl.getAttribLocation(this.program, "p");
    const uvLocation = gl.getAttribLocation(this.program, "uv");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.enableVertexAttribArray(uvLocation);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
  }

  clear(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  destroy(): void {
    this.canvas.remove();
    this.gl.deleteBuffer(this.positionBuffer);
    this.gl.deleteBuffer(this.uvBuffer);
    this.gl.deleteBuffer(this.indexBuffer);
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
  }

  private resize(): void {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.width = this.target.ownerDocument.documentElement.clientWidth;
    this.height = this.target.ownerDocument.documentElement.clientHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private shader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error("Unable to create WebGL shader");
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader) ?? "Unable to compile WebGL shader");
    }
    return shader;
  }

  private createProgram(): WebGLProgram {
    const vertex = this.shader(this.gl.VERTEX_SHADER, "attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){gl_Position=vec4(p,0.,1.);v=uv;}");
    const fragment = this.shader(this.gl.FRAGMENT_SHADER, "precision mediump float;uniform sampler2D tex;varying vec2 v;void main(){gl_FragColor=texture2D(tex,v);}");
    const program = this.gl.createProgram();
    if (!program) throw new Error("Unable to create WebGL program");
    this.gl.attachShader(program, vertex);
    this.gl.attachShader(program, fragment);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program) ?? "Unable to link WebGL program");
    }
    return program;
  }

  private buildGrid(): Uint16Array {
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let row = 0; row <= this.rows; row += 1) {
      for (let col = 0; col <= this.cols; col += 1) uvs.push(col / this.cols, row / this.rows);
    }
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const a = row * (this.cols + 1) + col;
        const b = a + 1;
        const c = a + this.cols + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    const typedIndices = new Uint16Array(indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, typedIndices, gl.STATIC_DRAW);
    return typedIndices;
  }
}
