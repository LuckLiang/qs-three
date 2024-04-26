import Eventable from '../core/Eventable';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/**
 * @class ElfElements
 * @classdesc 创建精灵元素，用于加载信息面板
 * @constructor
 * @param {Document} container 场景绑定的DOM元素
 * @returns {CSS2DRenderer} renderer 可用于渲染Dom元素的渲染器
 * @example
 * let ElfElements = LThree.ElfElements;
 * const elf = new ElfElements(dom);
 */
class ElfElements {
    constructor(container) {
        Object.assign(this, Eventable)
        this.container = container
        this.renderer = new CSS2DRenderer();
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        this.renderer.domElement.className = 't_elf_elements';
        this.renderer.domElement.style.position = 'absolute';
        // 相对标签原位置位置偏移大小
        this.renderer.domElement.style.top = '0px';
        this.renderer.domElement.style.left = '0px';
        this.renderer.domElement.style.bottom = '0px';
        this.renderer.domElement.style.right = '0px';
        // //设置.pointerEvents=none，以免模型标签HTML元素遮挡鼠标选择场景模型
        this.renderer.domElement.style.pointerEvents = 'none';
        this.container.appendChild(this.renderer.domElement);
        this.emit('created')
    }
}

/**
 * 创建一个标签
 * @param {HTMLElement} dom 自定义样式的dom节点
 * @param {Object} options 配置项
 * @param {Array} options.resPos=0,0,0 精灵元素场景坐标
 * @returns geometry
 * @example
 * // 创建dom
 * const elfDom = createDom();
 * // 创建CSS2DObject
 * const geometry = elf.createTag2D(elfDom, {
 *   resPos: [child.position.x, child.position.y + 1, child.position.z],
 * });
 * // 添加至场景中
 * QsThree.scene.add(geometry);
 */
ElfElements.prototype.createTag2D = function (dom, {resPos}) {
    // 光线投射  控制标签显隐
    dom.classList.add('t_elf');
    //避免HTML标签遮挡三维场景的鼠标事件
    dom.style.pointerEvents = 'none';
    //div元素包装为CSS3模型对象CSS3DObject
    let objecrCSS
    objecrCSS= new CSS2DObject(dom);
    objecrCSS.position.set(resPos[0],resPos[1],resPos[2])

    return objecrCSS;//返回CSS3模型标签    
}

export default ElfElements