import * as THREE from "three";
import sprite1 from '../../assets/sprites/snowflake1.png';
import sprite2 from '../../assets/sprites/snowflake2.png';
import sprite3 from '../../assets/sprites/snowflake3.png';
import sprite4 from '../../assets/sprites/snowflake4.png';
import sprite5 from '../../assets/sprites/snowflake5.png';
const TEXTURES = [
  [[0.55, 1, 1], sprite2, 1.2],
  [[0.45, 1, 1], sprite3, 1.15],
  [[0.35, 1, 1], sprite1, 1],
  [[0.25, 1, 1], sprite5, 0.8],
  [[0.15, 1, 1], sprite4, 0.1],
];
/**
 * @class Rain
 * @classdesc 雪天控制器
 * @constructor
 * @param {THREE.Scene} scene
 * @param {object} options
 * @param {Array} options.textures 纹理数组 颜色:[[0.55, 1, 1],纹理图片路径：'http://localhost/images/rain.png',大小：3。示例[ [[0.55, 1, 1], 'http://localhost/images/rain.png', 3], ...]
 * @param {Number} options.count=50 雨量一平方米内雨量
 * @param {Number} options.range=100 范围 
 * @param {Number} options.wind=0 风向 左:-1， 右:1
 */
let SCENE, COUNT, RANGE, WIND;
export default class Sonw {
  constructor(scene, options={}) {
    SCENE = scene;
    this.gruop = new THREE.Group();

    let { count = 50, range = 100, wind = 0, textures = TEXTURES } = options;
    COUNT = count * range;
    RANGE = range;
    WIND = wind;
    for (let i = 0; i < textures.length; i++) {
      const color = textures[i][0];
      const textureUrl = textures[i][1];
      const size = textures[i][2];
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
        textures[i * 3] += WIND;
        if (textures[i * 3 + 1] < -RANGE / 2 || textures[i * 3 + 1] > RANGE / 2)
          textures[i * 3 + 1] = RANGE / 2;
        // 风偏移
        if (textures[i * 3] < -RANGE / 2 || textures[i * 3] > RANGE / 2)
          textures[i * 3] = (-WIND * RANGE) / 2;
      }
      cloud.geometry.attributes.position.needsUpdate = true;
    }
  }

  createPointCloud(count, range, size, textureUrl, color) {
    const geometry = new THREE.BufferGeometry();
    const textureloader = new THREE.TextureLoader();
    let vertices = [];
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
      map: textureloader.load(textureUrl, assignSRGB),
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
    });

    materials.color.setHSL(color[0], color[1], color[2], THREE.SRGBColorSpace);

    const particles = new THREE.Points(geometry, materials);
    this.gruop.add(particles);
  }
  
}

const assignSRGB = ( texture ) => {

  texture.colorSpace = THREE.SRGBColorSpace;

};