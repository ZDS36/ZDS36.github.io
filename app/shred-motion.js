export function createShred(overlay, width, height) {
  const gl = overlay.getContext('webgl', { alpha: true, antialias: true });
  const stripCount = 14;
  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  function createRenderer() {
    if (!gl) return null;
    const program = gl.createProgram();
    const shaders = [
      [gl.VERTEX_SHADER, `
        attribute vec2 aPosition, aUV;
        attribute vec2 aPaper;
        uniform vec2 uSize;
        varying vec2 uv, paper;
        void main() {
          gl_Position = vec4(aPosition / uSize * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
          uv = aUV;
          paper = aPaper;
        }
      `],
      [gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform sampler2D uPrint;
        varying vec2 uv, paper;
        void main() {
          vec3 ink = texture2D(uPrint, uv).rgb;
          vec3 color = mix(ink, vec3(.88, .83, .71), max(0., paper.x) * .7);
          color *= 1. + min(0., paper.x);
          gl_FragColor = vec4(color * paper.y, paper.y);
        }
      `],
    ];
    for (const [type, source] of shaders) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);
    const size = gl.getUniformLocation(program, 'uSize');
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    ['aPosition', 'aUV', 'aPaper'].forEach((name, index) => {
      const attribute = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 24, index * 8);
    });
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return {
      load(sheet) {
        gl.viewport(0, 0, overlay.width, overlay.height);
        gl.uniform2f(size, width, height);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
      },
      draw(vertices) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6);
      },
    };
  }

  const renderer = createRenderer();
  const feedTime = .96;
  const duration = 2.42;

  function shred(direction, time, strips) {
    const side = direction === 'left' || direction === 'right';
    const reverse = direction === 'right' || direction === 'bottom';
    const length = side ? width : height;
    const span = side ? height : width;
    const flip = reverse ? -1 : 1;
    const reach = ease(time / feedTime);
    const front = reach * length;
    const segments = width <= 600 ? 16 : 24;
    const vertices = [];

    function vertex(u, v, bentU = u, bentV = v, shade = 0, alpha = 1) {
      const sourceU = reverse ? length - u : u;
      const drawU = reverse ? length - bentU : bentU;
      return side
        ? [drawU, bentV, sourceU / width, v / height, shade, alpha]
        : [bentV, drawU, v / width, sourceU / height, shade, alpha];
    }

    function panel(a, b, c, d) {
      vertices.push(...a, ...b, ...c, ...b, ...d, ...c);
    }

    if (reach < 1) panel(vertex(front, 0), vertex(front, span), vertex(length, 0), vertex(length, span));
    for (const strip of strips) {
      const { start, end, phase, sway, speed, fan, curl } = strip;
      const flight = clamp((time - feedTime - strip.delay) / speed);
      const alpha = 1 - ease((flight - .5) / .5);
      if (alpha <= 0 || front === 0) continue;
      const drift = ease(flight);
      const lift = ease(flight * 1.4);
      const wind = Math.sin(flight * Math.PI * 1.18) * ease(flight * 4);
      const dx = width * (fan * .58 * drift + sway * .11 * wind);
      const dy = height * ((.67 + curl * .29) * drift - .19 * wind);
      const middle = (start + end) * span / 2;
      let previous;

      // The paper stays attached at the cutting line. Its free end has the most room to flex.
      for (let segment = 0; segment <= segments; segment++) {
        const u = front * (segment / segments);
        const free = (front - u) / length;
        const slack = ease(free * 5);
        const flutter = free ** 1.23;
        const wave = phase + time * (7 + curl * 3) - free * 8.5;
        const roll = Math.sin(wave) * (.54 * slack + .98 * lift);
        const bend = Math.sin(wave + .8) * flutter * (.045 + .075 * lift);
        const cross = middle + span * (bend + sway * .048 * flutter + fan * .04 * lift);
        const along = u + length * (free * (.49 * lift - .044 * slack) - .23 * lift
          + Math.cos(wave) * flutter * (.024 + .065 * lift));
        const folded = Math.cos(roll) * (1 - .17 * slack - .18 * lift);
        const row = [start, (start + end) / 2, end].map((edge, index) => {
          const v = edge * span;
          const off = v - middle;
          const shade = (Math.cos(wave) * .2 + (index === 1 ? .19 : -.17)) * Math.max(slack, lift);
          const bentU = along + off * Math.sin(roll) * .44 + (side ? dx : dy) * flip;
          const bentV = cross + off * folded + (side ? dy : dx);
          return vertex(u, v, bentU, bentV, shade, alpha);
        });
        if (previous) {
          panel(previous[0], previous[1], row[0], row[1]);
          panel(previous[1], previous[2], row[1], row[2]);
        }
        previous = row;
      }
    }
    renderer.draw(vertices);
  }

  function makeStrips() {
    const weights = Array.from({ length: stripCount }, () => .7 + Math.random() * .6);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let edge = 0;
    return weights.map((weight, index) => {
      const start = edge;
      edge += weight / total;
      return {
        start, end: edge,
        phase: Math.random() * Math.PI * 2,
        sway: Math.random() * 2 - 1,
        fan: ((index / (stripCount - 1)) * 2 - 1) * .52 + Math.random() * .94 - .47,
        curl: Math.random(),
        delay: Math.random() * .12,
        speed: .95 + Math.random() * .33,
      };
    });
  }

  return renderer && {
    duration: duration * 1000,
    load: renderer.load,
    draw: shred,
    makeStrips,
    size(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
    },
    lost: () => gl.isContextLost(),
  };
}
