import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

/**
 * @class DeviceLight
 * @classdesc 工业设备发光插件
 * @constructor
 * @param {Scene} scene
 * @param {Camera} camera
 * @param {Renderer} renderer
 * @param {Object} [options]
 * @param {number} [options.threshold=0] 阀值 0-1
 * @param {number} [options.strength=1] 发光强度 0-3
 * @param {number} [options.radius=0] 发光半径 0-1
 * @param {boolean} [options.isOpenGUI=false] 开启GUI 
*/

class DeviceLight{
    #composer
    #bloomPass
    #options = {threshold:0, strength:1, radius:0, isOpenGUI:false}
    constructor(scene, camera, renderer, options) {
        this.#options = Object.assign(this.#options, options)
        // 创建了一个RenderPass对象，用于将场景渲染到纹理上。
        const renderScene = new RenderPass(scene, camera);
        // 创建了一个UnrealBloomPass对象，用于实现辉光效果。≈
        this.#bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,
            0.4,
            0.85
        );
        // 设置发光参数,阈值、强度和半径。
        this.#bloomPass.threshold = this.#options.threshold;
        this.#bloomPass.strength = this.#options.strength;
        this.#bloomPass.radius = this.#options.radius;
        // 创建了一个OutputPass对象，用于将最终渲染结果输出到屏幕上。
        const outputPass = new OutputPass();
        // 创建了一个EffectComposer对象，并将RenderPass、UnrealBloomPass和OutputPass添加到渲染通道中。
        this.#composer = new EffectComposer(renderer);
        this.#composer.addPass(renderScene);
        this.#composer.addPass(this.#bloomPass);
        this.#composer.addPass(outputPass);

        
        if (this.#options.isOpenGUI) {
            this.#addGUI()

        /**
         * 获取EffectComposer对象 用于将场景渲染到屏幕上
         * @returns {EffectComposer} composer 返回EffectComposer对象
         * @example
         * const composer = new DeviceLight(scene, camera, renderer).getComposer()
         * 
         * // 添加至渲染进程中
         * composer.render()
         */
        this.getComposer = function () {
            return this.#composer
        }
        /**
         * 获取配置项options对象 
         * @returns {Object} options 返回options对象
         */
        this.getOptions = function () {
            return this.#options
        }
        /**
         * 设置配置项options
         * @param {Object} [options]
         * @param {number} [options.threshold=0] 阀值 0-1
         * @param {number} [options.strength=1] 发光强度 0-3
         * @param {number} [options.radius=0] 发光半径 0-1
         * @param {boolean} [options.isOpenGUI=false] 开启GUI 
         */
        this.setOptions = function (options) {
            let {threshold, strength, radius} = this.#options = {options}
            this.#composer.threshold=Number(threshold)
            this.#composer.strength=Number(strength)
            this.#composer.radius = Number(radius)
            if (this.#options.isOpenGUI) {
                this.#addGUI()
            }
        }
    }      
    }
    
    #addGUI() {
        const gui = new GUI();
        const params = {threshold:this.#options.threshold, strength:this.#options.strength, radius:this.#options.radius}
        const bloomFolder = gui.addFolder("bloom");
        const self = this
        bloomFolder
            .add(params, "threshold", 0.0, 1.0)
            .onChange(function (value) {
                self.#bloomPass.threshold = Number(value);
            });

        bloomFolder
            .add(params, "strength", 0.0, 3.0)
            .onChange(function (value) {
                self.#bloomPass.strength = Number(value);
            });

        bloomFolder
            .add(params, "radius", 0.0, 1.0)
            .step(0.01)
            .onChange(function (value) {
                self.#bloomPass.radius = Number(value);
            });    
    }  
}

export default DeviceLight