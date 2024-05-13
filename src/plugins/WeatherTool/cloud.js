import * as THREE from "three";

//Cloud.js
const texture = new THREE.TextureLoader().load("http://localhost:8090/images/smoke.png"); //加载云朵素材
const cloudGeo = new THREE.BufferGeometry(56, 30); //创建平面几何体
const cloudMaterial = new THREE.MeshLambertMaterial({
  //图像作为纹理贴图，生成材质
  map: texture,
  transparent: true,
});
export default class Cloud {
  constructor() {
    const cloud = new THREE.Mesh(cloudGeo, cloudMaterial); //生成云朵物体
    cloud.material.opacity = 0.6;
    this.instance = cloud;
  }

  setPosition(x, y, z) {
    this.instance.position.set(x, y, z);
  }

  setRotation(x, y, z) {
    this.instance.rotation.x = x;
    this.instance.rotation.y = y;
    this.instance.rotation.z = z;
  }

  animate() {
    this.instance.rotation.z -= 0.003; //云朵的运动是不断绕着z轴旋转
  }
}
