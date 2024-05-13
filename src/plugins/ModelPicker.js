import * as THREE from "three";
import { EventDispatcher } from 'three';
let event
/**
 * @class ModelPicker
 * @classdesc 模型选择器,用于鼠标点选模型
 * @constructor
 * @param {Scene} scene 场景
 * @param {Camera} camera 相机
 * @param {Renderer} renderer 渲染器
 * @param {Object} options 
 * @param {string} eventName=click 需要监听的鼠标事件，'click', 'dblclick', 'mousemove'
 * @example
 * // 引入
 * let ModelPicker = LThree.ModelPicker;
 * // 初始化选取器
 * picker = new ModelPicker(scene, camera, renderer);
 * let selectedObject;
 * // 选中物体事件
 * picker.addEventListener("objectSelected", (event) => {
 *   const pickedObject = event.detail.object;
 *   const intersectionPoint = event.detail.point;
 *   const pObject = pickedObject.parent;
 *   // 处理选中逻辑，如更改颜色、添加高亮、显示信息等
 *   if (
 *     ["Box2131637856", "Box2131637852", "Box2131637876"].indexOf(
 *       pObject.name
 *     ) === -1
 *   )
 *     return;
 *   if (selectedObject) {
 *     // 如果选中的对象改变了，重置之前对象的颜色并更新新对象的颜色
 *     selectedObject.traverse((child) => {
 *       if (child.isMesh) {
 *         child.material = child.originalMaterial;
 *       }
 *     });
 *   }
 *   selectedObject = pObject;
 *   selectedObject.traverse((child) => {
 *     if (child.isMesh) {
 *       child.originalMaterial = child.material && child.material.clone();
 *       const material = new THREE.MeshStandardMaterial({
 *         ...child.material,
 *         emissive: 0x00ff00, // 设置物体的自发光颜色为红色
 *         emissiveIntensity: 0.01, // 设置发光的强度，范围通常是0到1
 *       });
 *       child.material = material;
 *     }
 *   });
 * });
 * 
 *  // 没有选中任何物体
 *  picker.addEventListener("objectDeselected", (event) => {
 *    const pickedObject = event.detail;
 *    // 处理选中逻辑，如更改颜色、添加高亮、显示信息等
 *    const pObject = pickedObject.parent;
 *    pObject.traverse((child) => {
 *      if (child.isMesh) {
 *        child.material = child.originalMaterial;
 *      }
 *    });
 *  });
 */
class ModelPicker extends EventDispatcher {
    constructor(scene, camera, renderer, options={}) {
        super();
        let { eventName = 'click' } = options
        event = eventName
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.enabled = true; // 控制是否启用拾取功能
        // 可选：设置默认拾取选项
        this.pickOptions = {
            recursive: true, // 是否递归检查子对象
            layers: [], // 指定要拾取的层，默认为所有层
        };
        this.bindEvents()
    }
    bindEvents() {
        const canvas = this.renderer.domElement;
        canvas.addEventListener(event, this.onDocumentMouseClick.bind(this), false);
    }
    unbindEvents() {
        const canvas = this.renderer.domElement;
        canvas.removeEventListener(event, this.onDocumentMouseClick);
    }
    onDocumentMouseClick(event) {
        const canvas = this.renderer.domElement;
        // 将屏幕坐标转换为标准化设备坐标
        this.mouse.x = (event.clientX / canvas.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / canvas.clientHeight) * 2 + 1;
        this.performPick();
    }
    performPick() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, this.pickOptions.recursive);
        if (intersects.length > 0) {
            const pickedObject = intersects[0].object;
            // 检查对象所属的图层是否在可选图层内
            if (
                this.pickOptions.layers.length === 0 ||
                this.pickOptions.layers.some(layer => pickedObject.layers.has(layer))
            ) {
                
                /**
                 * 选中物体事件
                 * @event ModelPicker#objectSelected
                 */
                this.dispatchEvent({
                    type: 'objectSelected',
                    detail: {
                        object: pickedObject,
                        point: intersects[0].point,
                    },
                });
            }
        } else {
            // 如果没有交点，则取消选中任何物体
            /**
             * 未选中物体事件
             * @event ModelPicker#objectDeselected
             */
            this.dispatchEvent({ type: 'objectDeselected'});
        }
    }
}
/**
 * 启用点选模型
 */
ModelPicker.prototype.enable = function() {
    if (!this.enabled) {
        this.bindEvents();
        this.enabled = true;
    }
}
/**
 * 禁用点选模型
 */
ModelPicker.prototype.disable = function() {
    if (this.enabled) {
        this.unbindEvents();
        this.enabled = false;
    }
}
/**
 * 设置当前的拾取选项
 * @param {Object} options 
 * @param {Boolean} [options.recursive=true] 是否递归检查子对象
 * @param {Number[]} [options.layers=[]] 指定要拾取的层，默认为所有层
 */
ModelPicker.prototype.setPickOptions = function(options={}) {
    this.pickOptions.recursive = options.recursive !== undefined ? options.recursive : true;
    this.pickOptions.layers = options.layers || [];
}

export default ModelPicker