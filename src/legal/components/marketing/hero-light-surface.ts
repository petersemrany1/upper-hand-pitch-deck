// Ported from the Legal app (family-law-floater/src/components/marketing/hero-light-surface.ts). Re-run the port script to refresh.
const vertexSource = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentSource = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;

vec4 silk(vec2 uv, float phase, float strength) {
  float x = uv.x * 2.0 - 1.0;
  float t = u_time;
  float wave = x * 2.55 - t * 0.18 + phase;
  float center = 0.34 + 0.145 * sin(wave) + 0.038 * sin(x * 5.1 + t * 0.12 + phase);
  float width = 0.155 + 0.035 * cos(x * 2.4 + t * 0.16 + phase);
  float v = (uv.y - center) / width;
  float coverage = 1.0 - smoothstep(0.97, 1.0, abs(v));
  float crossSection = clamp(v, -1.0, 1.0);
  float slope = 0.37 * cos(wave) + 0.194 * cos(x * 5.1 + t * 0.12 + phase);
  float fold = sin(crossSection * 2.3 + x * 0.65 + t * 0.13);
  vec3 normal = normalize(vec3(-slope * 0.8, fold * 0.75, 0.75));
  vec3 light = normalize(vec3(sin(t * 0.14) * 0.6 - 0.3, 0.7, 1.0));
  float diffuse = max(dot(normal, light), 0.0);
  float reflection = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);
  float rim = pow(abs(crossSection), 5.0);
  float caustic = exp(-pow((crossSection - 0.3 * sin(x * 2.1 + t * 0.27)) * 5.5, 2.0));
  vec3 porcelain = vec3(0.91, 0.95, 1.0);
  vec3 cobalt = vec3(0.24, 0.43, 0.88);
  vec3 color = mix(porcelain, cobalt, (1.0 - diffuse) * 0.65 + rim * 0.38);
  color = mix(color, vec3(1.0), reflection * 0.8 + caustic * 0.28);
  float innerShade = exp(-pow((crossSection + 0.66) * 7.0, 2.0));
  color = mix(color, vec3(0.37, 0.56, 0.94), innerShade * 0.26);
  return vec4(color, coverage * strength);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 back = silk(uv + vec2(0.0, -0.065), 1.45, 0.35);
  vec4 front = silk(uv, 0.0, 0.80);
  vec3 color = mix(vec3(1.0), back.rgb, back.a);
  color = mix(color, front.rgb, front.a);
  gl_FragColor = vec4(color, 1.0);
}
`;

/** A small, dependency-free material renderer, scoped to the visible hero. */
export function mountHeroLightSurface(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return () => {};

  const shaders: WebGLShader[] = [];
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const release = () => {
    shaders.forEach((shader) => gl.deleteShader(shader));
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
  };
  if (!vertex || !fragment || !program || !buffer) {
    release();
    return () => {};
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    release();
    return () => {};
  }

  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, "u_resolution");
  const time = gl.getUniformLocation(program, "u_time");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let previousFrame = 0;
  let elapsed = 0;
  let visible = true;
  let lost = false;

  const draw = () => {
    if (lost) return;
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(time, motion.matches ? 0 : elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset["ready"] = "true";
  };
  const tick = (now: number) => {
    frame = 0;
    if (lost || !visible || document.hidden || motion.matches) return;
    if (now - previousFrame >= 1000 / 30) {
      elapsed += previousFrame ? Math.min((now - previousFrame) / 1000, 0.1) : 0;
      previousFrame = now;
      draw();
    }
    frame = requestAnimationFrame(tick);
  };
  const updatePlayback = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousFrame = 0;
    if (motion.matches) draw();
    else if (visible && !document.hidden && !lost) frame = requestAnimationFrame(tick);
  };
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(bounds.width * scale));
    canvas.height = Math.max(1, Math.round(bounds.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    draw();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    canvas.dataset["ready"] = "false";
    cancelAnimationFrame(frame);
  };
  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    if (!entry) return;
    visible = entry.isIntersecting;
    updatePlayback();
  });
  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  motion.addEventListener("change", updatePlayback);
  document.addEventListener("visibilitychange", updatePlayback);
  canvas.addEventListener("webglcontextlost", onContextLost);
  resize();
  updatePlayback();

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    motion.removeEventListener("change", updatePlayback);
    document.removeEventListener("visibilitychange", updatePlayback);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.dataset["ready"] = "false";
    release();
  };
}
