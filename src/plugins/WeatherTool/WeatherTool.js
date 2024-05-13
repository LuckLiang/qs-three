import * as THREE from "three";
import Cloud from './cloud';
import Rain from './Snow';
//director.js
export default class WeatherTool {
    constructor(scene, camera, renderer) {
      this.scene = scene
      this.camera = camera
      this.renderer = renderer
    //set params
    //camera
    this.camera.fov = 60; //修改照相机的默认视场fov

    this.camera.rotation.x = 1.16; //设置照相机的旋转角度（望向天空）
    this.camera.rotation.y = -0.12;
    this.camera.rotation.z = 0.27;

    //添加云层和雨滴
    this.addCloud(); 
    this.addRainDrop();

    //添加光照，用PointLight模拟闪电
    this.addLightning();//

    //add fog
    // this.addFog(); //添加雾，在相机附近视野清晰，距离相机越远，雾的浓度越高

    //animate
    this.animate(); //requestAnimationFrame实现动画
  }
  addCloud() {
    this.clouds = [];
    for (let i = 0; i < 30; i++) {
      const cloud = new Cloud();
      
      this.clouds.push(cloud);
      cloud.setPosition(
        0,100 + Math.random() * 2,0
      );
      cloud.setRotation(1.16, -0.12, Math.random() * 360);
      this.scene.add(cloud.instance);
      
    }
  }
  addRainDrop() {
    this.rainDrop = new Rain(this.scene);
    this.scene.add(this.rainDrop.gruop);
  }
  animate() {
    //cloud move
    this.clouds.forEach((cloud) => {
      //调用每个云朵物体的animate方法，形成整个云层的不断变换效果
      cloud.animate();
    });

    //lightning
    if (Math.random() > 0.93 || this.lightning.intensity > 0) {
      if (this.lightning.intensity < 10) {
        this.lightning.position.set(
          Math.random() * 100,
          100 + Math.random() * 2,
          Math.random() * 100
        );
      }
      const lightTime = [0, 0, 0, 0, 0, 0, 0, 0,0,1],index = Math.floor(Math.random() * 10)
      if (lightTime[index]===1) {
        this.lightning.intensity = 1 + Math.random() * 2;
      } else {
        this.lightning.intensity = 0
      }
    }
      //rain drop move
      this.rainDrop.animate() 
      
  }
  addLightning() {
    const lightning = new THREE.DirectionalLight(0x0fffff, 0, 500, 1.7);
    lightning.position.set( Math.random() * 100,
    100 + Math.random() * 2,
    Math.random() * 100);
    this.lightning = lightning;
    this.scene.add(lightning);
  }

  addFog() {
    this.scene.fog = new THREE.FogExp2( 0xcccccc, 0.025 );
  }
}
