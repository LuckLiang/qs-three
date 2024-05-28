import * as THREE from "three";
import sprite1 from "../../assets/sprites/rain.png";
import sprite2 from "../../assets/sprites/rain2.png";
import sprite3 from "../../assets/sprites/rain3.png";

const TEXTURES = [
  [[0.55, 1, 1], sprite2, 3],
  [[0.45, 1, 1], sprite3, 2],
  [[0.35, 1, 1], sprite1, 1],
];
let SCENE, RENDERER, CAMERA, COUNT, RANGE, WIND, DEBUG=false;

let target;
let material;
let time = 0;
let box, orthCamera, depthScene;
const clock = new THREE.Clock();

export default class Rain {
  constructor(scene, renderer, camera, options = {}) {
    SCENE = scene;
    RENDERER = renderer;
    CAMERA = camera;
    this.gruop = new THREE.Group();
    let { count = 50, range = 100, size = 1, wind = 0,isdebug } = options;

    COUNT = count * range;
    WIND = wind;
    DEBUG = isdebug;
    RANGE = range;
    box = new THREE.Box3(
      new THREE.Vector3(-range, -range, -range),
      new THREE.Vector3(range, range, range)
    );

    this.createPointCloud(COUNT);

    /**
     * 更新配置
     * @param {Object} options
     * @param {Object} options.count
     * @param {Object} options.range
     * @param {Object} options.wind
     */
    this.updateOptions = function (options) {
      let { count, range, wind } = options;
      COUNT = count * range;
      RANGE = range;
      WIND = wind;
    };
  }

  animate() {
    time = clock.getElapsedTime() / 2;

    if (material.uniforms) {
      material.uniforms.cameraPosition.value = CAMERA.position;
      material.uniforms.time.value = time;

      material.uniforms.cameraMatrix.value =
        new THREE.Matrix4().multiplyMatrices(
          orthCamera.projectionMatrix,
          orthCamera.matrixWorldInverse
        );

      // material.uniforms.tDepth.value = target.texture;
    }
  }

  createPointCloud(count) {
    createDepth();
    const rain = createRain(count);
    this.gruop.add(rain);
  }
}

//创建深度图
function createDepth() {
  target = new THREE.WebGLRenderTarget(
    RENDERER.domElement.width,
    RENDERER.domElement.height
  );
  target.texture.format = THREE.RGBFormat;
  target.texture.minFilter = THREE.NearestFilter;
  target.texture.magFilter = THREE.NearestFilter;
  target.texture.generateMipmaps = false;

  orthCamera = new THREE.OrthographicCamera();
  const center = new THREE.Vector3();
  box.getCenter(center);

  orthCamera.left = box.min.x - center.x;
  orthCamera.right = box.max.x - center.x;
  orthCamera.top = box.max.z - center.z;
  orthCamera.bottom = box.min.z - center.z;
  orthCamera.near = 0.1;
  orthCamera.far = box.max.y - box.min.y;

  orthCamera.position.copy(center);
  orthCamera.position.y += box.max.y - center.y;
  orthCamera.lookAt(center);

  orthCamera.updateProjectionMatrix();
  orthCamera.updateWorldMatrix();
  if (DEBUG) {
    const helper = new THREE.CameraHelper(orthCamera);
    SCENE.add(helper);
  }
  depthScene = new THREE.Scene();
  depthScene.overrideMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying float color;

      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        color = gl_Position.z / 2.0 + 0.5;
      }
    `,
    fragmentShader: `
      varying float color;
      
      vec4 encodeFloat2RGBA(float v)
      {
          vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * v;
          enc = fract(enc);
          enc -= enc.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);
          return enc;
      }
      void main() {
          gl_FragColor = encodeFloat2RGBA(1.0 - color);
      }
    `,
  });

  RENDERER.setRenderTarget(target);
  RENDERER.render(depthScene, orthCamera);
  RENDERER.setRenderTarget(null);
}

//创建雨
function createRain(count) {
  //创建雨
  material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });

  material.onBeforeCompile = function (shader, renderer) {
    const getFoot = `
          attribute vec3 pos;
          uniform float top;
          uniform float bottom;
          uniform float time;
          uniform mat4 cameraMatrix;
          varying float depth;
          varying vec2 depthUv;
          #include <common>
          float angle(float x, float y){
              return atan(y, x);  
          }
          vec2 getFoot(vec2 camera,vec2 _n_pos,vec2 pos){
              vec2 position;

              float distanceLen = distance(pos, _n_pos);

              float a = angle(camera.x - _n_pos.x, camera.y - _n_pos.y);

              pos.x > _n_pos.x ? a -= 0.785 : a += 0.785; 

              position.x = cos(a) * distanceLen;
              position.y = sin(a) * distanceLen;
              
              return position + _n_pos;
          }
          `;
    const begin_vertex = `

          float height = top - bottom;

          vec3 _n_pos = vec3(pos.x, pos.y- height/30.,pos.z);

          vec2 foot = getFoot(vec2(cameraPosition.x, cameraPosition.z),  vec2(_n_pos.x, _n_pos.z), vec2(position.x, position.z));
          float y = _n_pos.y - bottom - height * fract(time);
          y += y < 0.0 ? height : 0.0;
          
           depth = (1.0 - y / height) ;

          y += bottom;
          y += position.y - _n_pos.y;
          vec3 transformed = vec3( foot.x, y, foot.y );
          vec4 cameraDepth = cameraMatrix * vec4(transformed, 1.0);
          depthUv = cameraDepth.xy/2.0 + 0.5;
          `;

    const depth_vary = `
          uniform sampler2D tDepth;
          uniform float opacity;
          varying float depth;
          varying vec2 depthUv;

          float decodeRGBA2Float(vec4 rgba)
          {
              return dot(rgba, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
          }
          `;

    const depth_frag = `
            if(1.0 - depth < decodeRGBA2Float(texture2D( tDepth, depthUv ))) discard;
            vec4 diffuseColor = vec4( diffuse, opacity );
          `;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      getFoot
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      begin_vertex
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "uniform float opacity;",
      depth_vary
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4 diffuseColor = vec4( diffuse, opacity );",
      depth_frag
    );

    shader.uniforms.cameraPosition = {
      value: new THREE.Vector3(0, RANGE, 0),
    };
    shader.uniforms.top = {
      value: box.max.y,
    };
    shader.uniforms.bottom = {
      value: box.min.y,
    };
    shader.uniforms.time = {
      value: 0,
    };

    shader.uniforms.cameraMatrix = {
      value: new THREE.Matrix4(),
    };
    shader.uniforms.tDepth = {
      value: target.texture,
    };
    material.uniforms = shader.uniforms;
  };

  const geometry = new THREE.BufferGeometry();

  const vertices = [];
  const poses = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < count; i++) {
    const pos = new THREE.Vector3();
    pos.x = Math.random() * (box.max.x - box.min.x) + box.min.x;
    pos.y = Math.random() * (box.max.y - box.min.y) + box.min.y;
    pos.z = Math.random() * (box.max.z - box.min.z) + box.min.z;

    const height = 1;
    const width = 0.056;

    vertices.push(
      pos.x + width,
      pos.y + height,
      pos.z,
      pos.x,
      pos.y + height,
      pos.z,
      pos.x,
      pos.y,
      pos.z,
      pos.x+ width,
      pos.y,
      pos.z,
    );
    poses.push(
      pos.x,
      pos.y,
      pos.z,
      pos.x,
      pos.y,
      pos.z,
      pos.x,
      pos.y,
      pos.z,
      pos.x,
      pos.y,
      pos.z
    );

    uvs.push(1, 1, 0, 1, 0, 0, 1, 0);

    indices.push(
      i * 4 + 0,
      i * 4 + 1,
      i * 4 + 2,
      i * 4 + 0,
      i * 4 + 2,
      i * 4 + 3
    );
  }

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );
  geometry.setAttribute(
    "pos",
    new THREE.BufferAttribute(new Float32Array(poses), 3)
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array(uvs), 2)
  );
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

  var mesh = new THREE.Mesh(geometry, material);

  return mesh;
}
