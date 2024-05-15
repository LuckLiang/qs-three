import * as THREE from "three";
import Cloud from "./cloud";
import Rain from "./Rain";
import Snow from "./Snow";

let rainOptions = {
  show: false,
  count:50,
}
let snowOptions = {
  show: false,
  count:50,
}

let lightOptions = {
  show: false,
  color: 0x0fffff,
  intensity: 1,
  radius: 100,
};

let fogOptions = {
  show: true,
  color: 0xcccccc,
  density: 0.025,
};

const defaultOptions = {
  rain: rainOptions,
  snow: snowOptions,
  light: lightOptions,
  fog: fogOptions,
};
/**
 * @class WeatheTool
 * @classdesc 天气工具
 * @constructor
 * @param {Scene} scene 场景
 * @param {camera} camera 相机
 * @param {renderer} renderer 渲染器
 * @param {Object} options 配置项
 * @param {Object} options.rain 雨天配置项
 * @param {Boolean} options.rain.show 是否显示
 * @param {Array} options.rain.textures 纹理数组 颜色:[[0.55, 1, 1],纹理图片路径：'http://localhost/images/rain.png',纹理大小：3。示例[ [[0.55, 1, 1], 'http://localhost/images/rain.png', 3], ...]
 * @param {Number} options.rain.count=50 一平方米内雨量
 * @param {Number} options.rain.range=100 范围 
 * @param {Number} options.rain.wind=0 风向 左:-1， 右:1
 * 
 * @param {Object} options.snow 雪天配置项
 * @param {Object} options.snow.show 是否显示
 * * @param {Array} options.rain.textures 纹理数组 颜色:[[0.55, 1, 1],纹理图片路径：'http://localhost/images/snow.png',纹理大小：3。示例[ [[0.55, 1, 1], 'http://localhost/images/snow.png', 3], ...]
 * @param {Number} options.rain.count=50 一平方米内雪量
 * @param {Number} options.rain.range=100 范围 
 * @param {Number} options.rain.wind=0 风向 左:-1， 右:1
 * 
 * @param {Object} options.light 闪电配置项
 * @param {Boolean} options.light.show=false 是否显示
 * @param {Number} options.light.color=0x0fffff 闪电颜色 一个表示颜色的 Color 的实例、字符串或数字，默认为一个白色（0x0fffff）的 Color 对象。
 * @param {Object} options.light.intensity=1.* 闪电强度，默认为 1.*
 * @param {Number} options.light.radius=100 闪电范围，在这个范围内随机移动
 *
 * @param {THREE.FogExp2} options.fog 雾配置项
 * @param {Boolean} options.fog.show 是否显示
 * @param {Number} options.fog.color=0xcccccc 颜色 一个表示颜色的 Color 的实例、字符串或数字，默认为一个白色（0xcccccc）的 Color 对象。
 * @param {Number} options.fog.density=0.025 定义雾的密度将会增长多块。
 *
 */
export default class WeatherTool {
  constructor(scene, camera, renderer, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    //set params
    //camera
    this.camera.fov = 60; //修改照相机的默认视场fov

    this.camera.rotation.x = 1.16; //设置照相机的旋转角度（望向天空）
    this.camera.rotation.y = -0.12;
    this.camera.rotation.z = 0.27;
    let { rain, snow, light, fog } = options
    if (rain) {
      rainOptions = Object.assign(rainOptions, rain);
    }
    if (snow) {
      snowOptions = Object.assign(snowOptions, snow);
    }
    if (light) {
      lightOptions = Object.assign(lightOptions, light);
    }
    if (fog) {
     fogOptions = Object.assign(fogOptions, fog);
    }
    //添加云层和雨滴

    this.addCloud();
    if (options.rain.show) this.addRainDrop();

    if (options.snow.show) this.addSonwDrop();

    //添加光照，用PointLight模拟闪电
    if (options.light.show) this.addLightning(); //

    //add fog
    if (options.fog.show) this.addFog(); //添加雾，在相机附近视野清晰，距离相机越远，雾的浓度越高

    //animate
    this.animate(); //requestAnimationFrame实现动画
  }
  addCloud() {
    this.clouds = [];
    for (let i = 0; i < 30; i++) {
      const cloud = new Cloud();

      this.clouds.push(cloud);
      cloud.setPosition(0, 100 + Math.random() * 2, 0);
      cloud.setRotation(1.16, -0.12, Math.random() * 360);
      this.scene.add(cloud.instance);
    }
  }
  addRainDrop() {
    this.rainDrop = new Rain(this.scene, rainOptions);
    this.scene.add(this.rainDrop.gruop);
  }

  addSonwDrop() {
    this.snowDrop = new Snow(this.scene,snowOptions);
    this.scene.add(this.snowDrop.gruop);
  }
  animate() {
    //cloud move
    this.clouds.forEach((cloud) => {
      //调用每个云朵物体的animate方法，形成整个云层的不断变换效果
      cloud.animate();
    });

    //lightning
    if (lightOptions.show) {
      if (Math.random() > 0.93 || this.lightning.intensity > 0) {
        if (this.lightning.intensity < 10) {
          this.lightning.position.set(
            Math.random() * 100,
            100 + Math.random() * 2,
            Math.random() * 100
          );
        }
        const lightTime = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          index = Math.floor(Math.random() * 10);
        if (lightTime[index] === 1) {
          this.lightning.intensity = 1 + Math.random() * 2;
        } else {
          this.lightning.intensity = 0;
        }
      }
    }
    //rain drop move
    this.rainDrop&&this.rainDrop.animate();
    this.snowDrop&&this.snowDrop.animate();
  }
  addLightning() {
    const lightning = new THREE.DirectionalLight(lightOptions.color, 0);
    lightning.position.set(
      Math.random() * lightOptions.radius,
      lightOptions.radius + Math.random() * 2,
      Math.random() * lightOptions.radius
    );
    this.lightning = lightning;
    this.scene.add(lightning);
  }

  addFog() {
    this.scene.fog = new THREE.FogExp2(fogOptions.color, fogOptions.density);
  }
}
