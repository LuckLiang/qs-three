import * as THREE from "three";

//Rain.js
let SCENE, COUNT = 10000, RANGE = 600, WIND=-1;
export default class Sonw {
  constructor(scene) {
    SCENE = scene;
    this.gruop = new THREE.Group();
    const sprite1 =
      "https://threejs.org/examples/textures/sprites/snowflake1.png";
    const sprite2 =
      "https://threejs.org/examples/textures/sprites/snowflake2.png";
    const sprite3 =
      "https://threejs.org/examples/textures/sprites/snowflake3.png";
    const sprite4 =
      "https://threejs.org/examples/textures/sprites/snowflake4.png";
    const sprite5 =
      "https://threejs.org/examples/textures/sprites/snowflake5.png";

    const parameters = [
      [[0.55, 1, 1], sprite2, 1.20],
      [[0.45, 1, 1], sprite3, 1.15],
      [[0.35, 1, 1], sprite1, 1],
      [[0.25, 1, 1], sprite5, .8],
      [[0.15, 1, 1], sprite4, .1],
    ];
    for (let i = 0; i < parameters.length; i++) {
      const color = parameters[i][0];
      const textureUrl = parameters[i][1];
      const size = parameters[i][2];
      this.createPointCloud(COUNT, RANGE, size, textureUrl, color);
    }
  }

  animate() {
    if (!this.gruop.children || this.gruop.children.length <= 0) return;
    for (let i = 0; i < this.gruop.children.length; i++) {
      const cloud = this.gruop.children[i];
      const textures = cloud.geometry.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        textures[i * 3 + 1] -= 1;
        textures[i * 3 ] += WIND;
        if ( textures[ i * 3 + 1 ] < -RANGE/2 || textures[ i * 3 + 1 ] > RANGE/2 )
          textures[i * 3 + 1] = RANGE / 2;
        // 风偏移
        if ( textures[ i * 3 ] < -RANGE/2 || textures[ i * 3 ] > RANGE/2 )
          textures[ i * 3 ] = -WIND*RANGE/2;
      }
      cloud.geometry.attributes.position.needsUpdate = true;
    }
  }

  createPointCloud(count, range, size, textureUrl, color) {
    const geometry = new THREE.BufferGeometry();
    const textureloader = new THREE.TextureLoader();
    let vertices = []
    for (let i = 0; i < count; i++) {
      const x = Math.random() * range - range / 2;
      const y = Math.random() * range - range / 2;
      const z = Math.random() * range - range / 2;

      vertices.push(x, y, z);
    }
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    const materials = new THREE.PointsMaterial({
      size: size,
      map: textureloader.load(textureUrl),
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
    });

    materials.color.setHSL(color[0], color[1], color[2], THREE.SRGBColorSpace);

    const particles = new THREE.Points(geometry, materials);
    this.gruop.add(particles);
  }
}
