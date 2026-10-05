/**
 * ==============================================================================
 * DevSim - Multi-Device Simulator
 * ระบบจำลองหน้าจออุปกรณ์หลากหลายขนาดสำหรับทดสอบ Responsive Web Design
 * เขียนด้วย JavaScript ES6 ทันสมัย พร้อมโครงสร้างที่แยกส่วนฟังก์ชันชัดเจน
 * ==============================================================================
 */

// ==============================================================================
// 1. ค่าคงที่และโครงแบบเริ่มต้น (Configurations & Default Devices)
// ==============================================================================

/** คีย์สำหรับจัดเก็บข้อมูลอุปกรณ์กำหนดเองใน LocalStorage */
const STORAGE_KEY = 'devSimCustomDevicesV2';

/** รายการอุปกรณ์เริ่มต้นที่ระบบเตรียมไว้ให้ */
const DEFAULT_DEVICES = {
    'iphone-17': { 
        name: 'iPhone 17', 
        w: 393, 
        h: 852, 
        notch: true, 
        type: 'mobile', 
        group: 'Phones' 
    },
    'iphone-17-pro': { 
        name: 'iPhone 17 Pro', 
        w: 393, 
        h: 852, 
        notch: true, 
        type: 'mobile', 
        group: 'Phones' 
    },
    'iphone-17-pro-max': { 
        name: 'iPhone 17 Pro Max', 
        w: 430, 
        h: 932, 
        notch: true, 
        type: 'mobile', 
        group: 'Phones' 
    },
    'ipad-air': { 
        name: 'iPad Air', 
        w: 820, 
        h: 1180, 
        notch: false, 
        type: 'tablet', 
        group: 'Tablets' 
    },
    'laptop-1366': { 
        name: 'Laptop (1366 × 768)', 
        w: 1366, 
        h: 768, 
        notch: false, 
        type: 'desktop', 
        group: 'Desktops' 
    },
    'desktop-720p': { 
        name: 'Desktop 720p (1280 × 720)', 
        w: 1280, 
        h: 720, 
        notch: false, 
        type: 'desktop', 
        group: 'Desktops' 
    },
    'desktop-1440': { 
        name: 'Desktop (1440 × 900)', 
        w: 1440, 
        h: 900, 
        notch: false, 
        type: 'desktop', 
        group: 'Desktops' 
    },
    'desktop-1080p': { 
        name: 'Desktop 1080p (1920 × 1080)', 
        w: 1920, 
        h: 1080, 
        notch: false, 
        type: 'desktop', 
        group: 'Desktops' 
    }
};

// ==============================================================================
// 2. สถานะของแอปพลิเคชัน (Application State)
// ==============================================================================

const state = {
    globalUrl: 'demo.html',
    viewCounter: 0,
    zoom: 0.55,        // ระดับสเกลการแสดงผล
    isAutoFit: true,   // โหมดปรับขนาดพอดีจออัตโนมัติ (Smart Fit All)
    views: {},         // จัดเก็บสถานะหน้าจอที่เปิดอยู่: { [vid]: { deviceKey, isLandscape } }
    customDevices: {}, // รายการอุปกรณ์ที่ผู้ใช้เพิ่มขึ้นมาเอง
    allDevices: {}     // อุปกรณ์ทั้งหมด (Default + Custom)
};

// ==============================================================================
// 3. ฟังก์ชันจัดการ LocalStorage (Storage Helpers)
// ==============================================================================

/**
 * ดึงข้อมูลอุปกรณ์กำหนดเอง (Custom Devices) ที่เคยบันทึกไว้จาก LocalStorage
 * @returns {Object} ข้อมูลอุปกรณ์กำหนดเอง
 */
const loadCustomDevices = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('ไม่สามารถโหลดข้อมูลอุปกรณ์จาก LocalStorage:', error);
        return {};
    }
};

/**
 * บันทึกรายการ Custom Devices ลงใน LocalStorage
 * @param {Object} devices - ข้อมูลอุปกรณ์ที่ต้องการจัดเก็บ
 */
const saveCustomDevicesToStorage = (devices) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    } catch (error) {
        console.error('ไม่สามารถบันทึกข้อมูลอุปกรณ์ลงใน LocalStorage:', error);
    }
};

// ==============================================================================
// 4. ฟังก์ชันช่วยเหลือด้าน URL (URL Utilities)
// ==============================================================================

/**
 * จัดรูปแบบ URL ให้ถูกต้องและเติม Protocol อัตโนมัติหากผู้ใช้ไม่ได้พิมพ์มา
 * @param {string} rawUrl - ข้อความ URL ที่ผู้ใช้กรอก
 * @returns {string|null} URL ที่จัดรูปแบบแล้ว หรือ null หากค่าว่าง
 */
const formatUrl = (rawUrl) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    // หากเป็นไฟล์ในโปรเจกต์ เช่น demo.html หรือ relative path
    if (trimmed.endsWith('.html') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
        return trimmed;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        const isLocalhost = trimmed.includes('localhost') || trimmed.includes('127.0.0.1');
        return isLocalhost ? `http://${trimmed}` : `https://${trimmed}`;
    }
    return trimmed;
};

// ==============================================================================
// 5. ฟังก์ชันสร้างและอัปเดต UI (UI & Dropdown Generators)
// ==============================================================================

/**
 * สร้าง HTML สำหรับตัวเลือก <option> ใน Dropdown โดยจัดกลุ่มตามประเภทอุปกรณ์
 * @param {string} selectedKey - คีย์ของอุปกรณ์ที่เลือกอยู่ปัจจุบัน
 * @returns {string} HTML string ของตัวเลือกใน Dropdown
 */
const generateDropdownHTML = (selectedKey) => {
    const groups = {
        Phones: [],
        Tablets: [],
        Desktops: [],
        Custom: []
    };

    Object.entries(state.allDevices).forEach(([key, config]) => {
        const isSelected = key === selectedKey ? 'selected' : '';
        const optionHtml = `<option value="${key}" ${isSelected}>${config.name}</option>`;
        if (groups[config.group]) {
            groups[config.group].push(optionHtml);
        }
    });

    let html = '';
    if (groups.Phones.length) html += `<optgroup label="Phones">${groups.Phones.join('')}</optgroup>`;
    if (groups.Tablets.length) html += `<optgroup label="Tablets">${groups.Tablets.join('')}</optgroup>`;
    if (groups.Desktops.length) html += `<optgroup label="Desktops">${groups.Desktops.join('')}</optgroup>`;
    if (groups.Custom.length) html += `<optgroup label="Custom Devices">${groups.Custom.join('')}</optgroup>`;

    return html;
};

/**
 * อัปเดต Dropdown ในทุกหน้าจอที่เปิดอยู่ (เรียกใช้เมื่อมีการเพิ่ม Custom Device ใหม่)
 */
const updateAllDropdowns = () => {
    Object.keys(state.views).forEach((vid) => {
        const select = document.getElementById(`select-${vid}`);
        if (select) {
            const currentVal = select.value;
            select.innerHTML = generateDropdownHTML(currentVal);
        }
    });
};

// ==============================================================================
// 6. ฟังก์ชันควบคุมการทำงานและดีไซน์ของหน้าจอจำลอง (Device View Operations)
// ==============================================================================

// ==============================================================================
// 6. ฟังก์ชันควบคุมการทำงานและดีไซน์ของหน้าจอจำลอง (Device View Operations)
// ==============================================================================

/** ตัวนับลำดับชั้นการแสดงผลของหน้าต่าง (Z-Index Manager) */
let zIndexCounter = 10;

/**
 * ดึงหน้าต่างที่คลิกขึ้นมาอยู่ด้านบนสุด
 * @param {string} vid - ID ของหน้าต่างจำลอง
 */
const bringToFront = (vid) => {
    const wrapper = document.getElementById(vid);
    if (wrapper) {
        zIndexCounter += 1;
        wrapper.style.zIndex = zIndexCounter;
    }
};

/**
 * ปรับขนาด สไตล์กรอบ (Mobile/Desktop) ติ่งหน้าจอ (Notch) และปุ่มหมุนตามสถานะของอุปกรณ์
 * @param {string} vid - ID ของหน้าต่างจำลอง (เช่น 'view_0')
 */
const applyDeviceStyles = (vid) => {
    const currentView = state.views[vid];
    if (!currentView) return;

    const config = state.allDevices[currentView.deviceKey];
    if (!config) return;

    const frame = document.getElementById(`frame-${vid}`);
    const notch = document.getElementById(`notch-${vid}`);
    const dimension = document.getElementById(`dim-${vid}`);
    const btnRot = document.getElementById(`btn-rot-${vid}`);

    if (!frame || !notch || !dimension || !btnRot) return;

    let w, h;
    if (currentView.isCustomSize && currentView.w && currentView.h) {
        w = currentView.w;
        h = currentView.h;
    } else {
        w = currentView.isLandscape ? config.h : config.w;
        h = currentView.isLandscape ? config.w : config.h;
    }

    currentView.w = w;
    currentView.h = h;

    // กำหนดขนาดและแสดงข้อความบอกขนาดพิกเซล
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    dimension.textContent = `${w} × ${h}`;

    // กำหนดรูปแบบกรอบ (Mobile/Tablet หรือ Desktop)
    const isDesktop = config.type === 'desktop' || w >= 960;
    frame.classList.toggle('device-desktop', isDesktop);
    frame.classList.toggle('device-mobile', !isDesktop);

    // ควบคุมการแสดงผล Dynamic Island / Notch
    const shouldShowNotch = config.notch && !isDesktop && w <= 600;
    if (shouldShowNotch) {
        notch.classList.remove('notch-hidden');
        notch.classList.toggle('notch-portrait', !currentView.isLandscape);
        notch.classList.toggle('notch-landscape', currentView.isLandscape);
    } else {
        notch.classList.add('notch-hidden');
    }

    // ปรับสีปุ่มหมุนจอเพื่อแสดงสถานะว่ากำลังหมุนอยู่หรือไม่
    btnRot.classList.toggle('text-blue-400', currentView.isLandscape);
    btnRot.classList.toggle('bg-blue-900/30', currentView.isLandscape);
    btnRot.classList.toggle('text-gray-400', !currentView.isLandscape);
    btnRot.classList.toggle('hover:bg-gray-700', !currentView.isLandscape);
};

/**
 * ปรับระดับการซูม/สเกลของพื้นที่ Workspace
 * @param {number} level - ตัวเลขสเกล เช่น 0.75 สำหรับ 75%
 * @param {boolean} isManual - true หากเป็นการปรับมือเองจากผู้ใช้
 */
const setZoom = (level, isManual = false) => {
    if (isManual) {
        state.isAutoFit = false;
    }

    const clamped = Math.min(1.5, Math.max(0.35, Math.round(level * 100) / 100));
    state.zoom = clamped;

    const workspace = document.getElementById('workspace');
    if (workspace) {
        workspace.style.setProperty('--workspace-zoom', clamped);
        workspace.style.zoom = clamped;
    }

    const selectZoom = document.getElementById('select-zoom');
    if (selectZoom) {
        if (state.isAutoFit) {
            selectZoom.value = 'fit';
        } else {
            const numericOptions = Array.from(selectZoom.options)
                .map((o) => parseFloat(o.value))
                .filter((v) => !isNaN(v));
            if (numericOptions.length > 0) {
                const closest = numericOptions.reduce((prev, curr) => 
                    Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
                );
                if (Math.abs(closest - clamped) < 0.06) {
                    selectZoom.value = closest.toString();
                }
            }
        }
    }
};

/**
 * คำนวณและปรับขนาดสเกลอัตโนมัติให้ทุกหน้าจอพอดีกับหน้าต่างเบราว์เซอร์ทั้งแนวกว้างและแนวดิ่ง (Smart Fit All)
 */
const fitToScreen = () => {
    state.isAutoFit = true;
    const workspace = document.getElementById('workspace');
    if (!workspace) return;

    const viewsList = Object.values(state.views);
    if (viewsList.length === 0) return;

    // คำนวณพื้นที่จริงของเบราว์เซอร์
    const availWidth = window.innerWidth - 60;
    const availHeight = window.innerHeight - 150; // หักลบส่วนหัว header และ padding

    let minX = Infinity;
    let maxX = 0;
    let minY = Infinity;
    let maxY = 0;

    viewsList.forEach((v) => {
        const x = v.x || 40;
        const y = v.y || 30;
        const w = (v.w || 393) + 28;
        const h = (v.h || 852) + 75;

        if (x < minX) minX = x;
        if (x + w > maxX) maxX = x + w;
        if (y < minY) minY = y;
        if (y + h > maxY) maxY = y + h;
    });

    const boundingWidth = Math.max(maxX - minX + 60, 400);
    const boundingHeight = Math.max(maxY - minY + 60, 400);

    const zoomW = availWidth / boundingWidth;
    const zoomH = availHeight / boundingHeight;

    const bestZoom = Math.min(zoomW, zoomH, 1.0);
    const clampedZoom = Math.max(0.35, Math.round(bestZoom * 100) / 100);

    setZoom(clampedZoom, false);

    const selectZoom = document.getElementById('select-zoom');
    if (selectZoom) selectZoom.value = 'fit';
};

/**
 * จัดเรียงหน้าต่างจำลองทุกเครื่องให้เรียงแถวกันอย่างเป็นระเบียบ
 */
const alignViewsInRow = () => {
    let currentX = 40;
    const currentY = 30;
    const gap = 40;

    Object.keys(state.views).forEach((vid) => {
        const viewWrapper = document.getElementById(vid);
        const v = state.views[vid];
        if (viewWrapper && v) {
            v.x = currentX;
            v.y = currentY;
            viewWrapper.style.left = `${currentX}px`;
            viewWrapper.style.top = `${currentY}px`;
            currentX += (v.w || 400) + gap;
        }
    });

    fitToScreen();
};

/**
 * สร้างหน้าต่างจำลองอุปกรณ์ใหม่ (Device View) รองรับการลากย้ายอิสระ และลากปรับขนาดที่มุม
 * @param {string} initialDeviceKey - คีย์ของอุปกรณ์เริ่มต้นที่ต้องการแสดงผล
 * @param {object|null} customOptions - ข้อมูลการปรับแต่ง (ถ้ามี เช่น นำเข้าจากลิงก์แชร์)
 */
const createView = (initialDeviceKey = 'iphone-17', customOptions = null) => {
    const vid = `view_${state.viewCounter++}`;
    const devKey = (customOptions && customOptions.deviceKey) ? customOptions.deviceKey : initialDeviceKey;
    const config = state.allDevices[devKey] || { w: 393, h: 852 };
    const initW = (customOptions && customOptions.w) ? customOptions.w : config.w;
    const initH = (customOptions && customOptions.h) ? customOptions.h : config.h;

    // คำนวณตำแหน่งเริ่มต้นแบบเรียงต่อท้ายในแนวนอน
    let spawnX = (customOptions && customOptions.x !== undefined) ? customOptions.x : 40;
    const spawnY = (customOptions && customOptions.y !== undefined) ? customOptions.y : 30;
    if (!customOptions) {
        const existingViews = Object.values(state.views);
        if (existingViews.length > 0) {
            let rightmost = 40;
            existingViews.forEach((ev) => {
                if (ev.x !== undefined && ev.w !== undefined) {
                    const r = ev.x + ev.w + 40;
                    if (r > rightmost) rightmost = r;
                }
            });
            spawnX = rightmost;
        }
    }

    state.views[vid] = { 
        deviceKey: devKey, 
        isLandscape: customOptions ? !!customOptions.isLandscape : false,
        w: initW,
        h: initH,
        x: spawnX,
        y: spawnY,
        isLocked: customOptions ? customOptions.isLocked !== false : true, // ล็อคขนาดและสัดส่วนของโทรศัพท์ที่เลือกไว้เป็นค่าเริ่มต้น
        isCustomSize: customOptions ? !!customOptions.isCustomSize : false
    };

    const workspace = document.getElementById('workspace');
    const viewWrapper = document.createElement('div');
    viewWrapper.id = vid;
    viewWrapper.className = 'device-view animate-[popIn_0.3s_ease-out_forwards]';
    viewWrapper.style.left = `${spawnX}px`;
    viewWrapper.style.top = `${spawnY}px`;
    viewWrapper.style.zIndex = ++zIndexCounter;

    // โครงสร้างส่วนหัวของหน้าต่าง (ปุ่มจับลาก, Dropdown, ปุ่มล็อคขนาด, ปุ่มรีเซ็ต, ปุ่มหมุน, ปุ่มปิด)
    const headerHtml = `
        <div class="view-header flex items-center gap-1.5 bg-[#161a22] p-1.5 rounded-xl border border-gray-700 shadow-lg hover:border-gray-500 transition-colors">
            <div class="text-gray-500 hover:text-gray-300 px-1 cursor-grab" title="คลิกค้างแล้วลากเพื่อย้ายตำแหน่งไปตรงไหนก็ได้ของกระดาน">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M104,40A16,16,0,1,1,88,24,16,16,0,0,1,104,40Zm48-16a16,16,0,1,0,16,16A16,16,0,0,0,152,24ZM88,112a16,16,0,1,0,16,16A16,16,0,0,0,88,112Zm64,0a16,16,0,1,0,16,16A16,16,0,0,0,152,112ZM88,200a16,16,0,1,0,16,16A16,16,0,0,0,88,200Zm64,0a16,16,0,1,0,16,16A16,16,0,0,0,152,200Z"></path>
                </svg>
            </div>
            <select id="select-${vid}" class="bg-transparent border-none outline-none text-gray-200 text-sm font-medium cursor-pointer py-1 pl-1 pr-6 appearance-none focus:ring-0 w-36">
                ${generateDropdownHTML(devKey)}
            </select>
            <div class="w-px h-6 bg-gray-700 mx-0.5"></div>
            <!-- ปุ่มสลับล็อค/ปลดล็อคสัดส่วนตามรุ่นโทรศัพท์ -->
            <button id="btn-lock-${vid}" class="p-1.5 rounded-lg text-blue-400 hover:bg-gray-700 transition-colors" title="ล็อคขนาดตามสัดส่วนของโทรศัพท์ (คลิกเพื่อสลับ)">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"></path>
                </svg>
            </button>
            <!-- ปุ่มรีเซ็ตขนาดกลับสู่ขนาดมาตรฐานของรุ่น 100% -->
            <button id="btn-reset-${vid}" class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" title="คืนค่าขนาดมาตรฐานของรุ่น (Reset Size)">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M224,128a96,96,0,0,1-96,96,8,8,0,0,1,0-16,80,80,0,1,0-56.57-23.43L96,160H40a8,8,0,0,1-8-8V96a8,8,0,0,1,16,0v36.69l22.63-22.63A96,96,0,0,1,224,128Z"></path>
                </svg>
            </button>
            <button id="btn-rot-${vid}" class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors" title="Rotate Screen (หมุนจอ)">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M140.24,67.76l-16-16a8,8,0,0,0-11.31,0l-16,16a8,8,0,0,0,11.31,11.31L120,67.31V128a8,8,0,0,0,16,0V67.31l11.76,11.76a8,8,0,0,0,11.31-11.31ZM240,128a112.13,112.13,0,0,1-112,112,8,8,0,0,1,0-16,96.11,96.11,0,0,0,96-96,8,8,0,0,1,16,0ZM24,128A112.13,112.13,0,0,1,136,16a8,8,0,0,1,0,16A96.11,96.11,0,0,0,40,128a8,8,0,0,1-16,0Z"></path>
                </svg>
            </button>
            <button id="btn-close-${vid}" class="p-1.5 rounded-lg text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors" title="Close View (ปิดหน้าต่าง)">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
                </svg>
            </button>
        </div>
    `;

    // โครงสร้างตัวกรอบจำลอง, ม่านป้องกัน Pointer, iframe และ Handle ลากปรับขนาดที่มุม
    const frameHtml = `
        <div id="frame-${vid}" class="device-frame">
            <div id="notch-${vid}" class="notch notch-portrait"></div>
            <div id="loader-${vid}" class="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm hidden">
                <div class="loader"></div>
            </div>
            <div class="drag-shield"></div>
            <iframe id="iframe-${vid}" class="device-iframe" src="${state.globalUrl}" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
            <div id="handle-${vid}" class="resize-handle" title="คลิกค้างแล้วลากเพื่อปรับขนาด (ล็อคสัดส่วนตามรุ่น) / ดับเบิลคลิกเพื่อคืนค่าขนาดเดิม">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="16 20 20 20 20 16"></polyline>
                    <line x1="14" y1="14" x2="20" y2="20"></line>
                    <line x1="8" y1="20" x2="20" y2="8"></line>
                </svg>
            </div>
        </div>
        <div id="dim-${vid}" class="bg-black/60 px-4 py-1.5 rounded-full text-xs font-mono text-gray-400 border border-gray-800 tracking-widest mt-1"></div>
    `;

    viewWrapper.innerHTML = headerHtml + frameHtml;
    workspace.appendChild(viewWrapper);

    // ดึง Element ภายใน View เพื่อผูก Event
    const select = document.getElementById(`select-${vid}`);
    const btnLock = document.getElementById(`btn-lock-${vid}`);
    const btnReset = document.getElementById(`btn-reset-${vid}`);
    const btnRot = document.getElementById(`btn-rot-${vid}`);
    const btnClose = document.getElementById(`btn-close-${vid}`);
    const iframe = document.getElementById(`iframe-${vid}`);
    const loader = document.getElementById(`loader-${vid}`);
    const header = viewWrapper.querySelector('.view-header');
    const resizeHandle = document.getElementById(`handle-${vid}`);
    const frame = document.getElementById(`frame-${vid}`);

    // นำหน้าต่างที่คลิกขึ้นมาอยู่ด้านบนสุด
    viewWrapper.addEventListener('pointerdown', () => bringToFront(vid));

    // ฟังก์ชันอัปเดตไอคอนล็อคขนาด
    const updateLockBtnUI = () => {
        const v = state.views[vid];
        if (!v || !btnLock) return;
        if (v.isLocked) {
            btnLock.classList.add('text-blue-400');
            btnLock.classList.remove('text-gray-400');
            btnLock.title = 'ล็อคขนาดตามสัดส่วนโทรศัพท์ (คลิกเพื่อปลดล็อคอิสระ)';
            btnLock.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"></path>
                </svg>
            `;
        } else {
            btnLock.classList.remove('text-blue-400');
            btnLock.classList.add('text-gray-400');
            btnLock.title = 'ปรับขนาดอิสระ (คลิกเพื่อล็อคสัดส่วนตามรุ่นโทรศัพท์)';
            btnLock.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M208,80H96V56a32,32,0,0,1,62.65-9.35,8,8,0,0,0,15.48-4A48,48,0,0,0,80,56V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM208,208H48V96H208V208Z"></path>
                </svg>
            `;
        }
    };

    // ฟังก์ชันคืนค่าขนาดสู่มาตรฐาน 100% ของรุ่น
    const resetToModelSize = () => {
        const v = state.views[vid];
        if (!v) return;
        v.isCustomSize = false;
        v.isLocked = true;
        applyDeviceStyles(vid);
        updateLockBtnUI();
        if (state.isAutoFit) fitToScreen();
    };

    btnLock.addEventListener('click', () => {
        state.views[vid].isLocked = !state.views[vid].isLocked;
        updateLockBtnUI();
    });

    btnReset.addEventListener('click', resetToModelSize);
    resizeHandle.addEventListener('dblclick', resetToModelSize);

    // 1. ระบบคลิกลากเพื่อย้ายตำแหน่งหน้าต่างไปตรงไหนก็ได้บนกระดาน (Drag & Move)
    header.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, select, input')) return;
        e.preventDefault();
        bringToFront(vid);

        const startX = e.clientX;
        const startY = e.clientY;
        const initialX = state.views[vid].x;
        const initialY = state.views[vid].y;

        document.body.classList.add('dragging-active');
        viewWrapper.classList.add('is-dragging');

        const onPointerMove = (moveEvent) => {
            const currentZoom = state.zoom || 1.0;
            const dx = (moveEvent.clientX - startX) / currentZoom;
            const dy = (moveEvent.clientY - startY) / currentZoom;

            const newX = Math.max(10, Math.round(initialX + dx));
            const newY = Math.max(10, Math.round(initialY + dy));

            state.views[vid].x = newX;
            state.views[vid].y = newY;
            viewWrapper.style.left = `${newX}px`;
            viewWrapper.style.top = `${newY}px`;
        };

        const onPointerUp = () => {
            document.body.classList.remove('dragging-active');
            viewWrapper.classList.remove('is-dragging');
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    });

    // 2. ระบบคลิกลากที่มุมขวาล่างเพื่อปรับขนาดหน้าจอ (ล็อคสัดส่วนตามรุ่นโทรศัพท์)
    resizeHandle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        bringToFront(vid);

        const startX = e.clientX;
        const startY = e.clientY;
        const v = state.views[vid];
        const initialW = v.w;
        const initialH = v.h;
        const conf = state.allDevices[v.deviceKey] || { w: initialW, h: initialH };
        const baseW = v.isLandscape ? conf.h : conf.w;
        const baseH = v.isLandscape ? conf.w : conf.h;
        const ratio = baseH / baseW;

        document.body.classList.add('dragging-active');
        viewWrapper.classList.add('is-resizing');

        const onPointerMove = (moveEvent) => {
            const currentZoom = state.zoom || 1.0;
            const dx = (moveEvent.clientX - startX) / currentZoom;
            const dy = (moveEvent.clientY - startY) / currentZoom;

            let newW, newH;

            // หากเปิดล็อคขนาดโทรศัพท์ (isLocked = true) ให้ล็อคตามอัตราส่วนของรุ่นเสมอ
            if (v.isLocked) {
                newW = Math.max(260, Math.round(initialW + dx));
                newH = Math.round(newW * ratio);
            } else {
                newW = Math.max(260, Math.round(initialW + dx));
                newH = Math.max(200, Math.round(initialH + dy));
            }

            v.w = newW;
            v.h = newH;
            v.isCustomSize = true;

            frame.style.width = `${newW}px`;
            frame.style.height = `${newH}px`;

            const scalePct = Math.round((newW / baseW) * 100);
            const dimText = v.isLocked 
                ? `${newW} × ${newH} (${scalePct}%) 🔒` 
                : `${newW} × ${newH}`;
            document.getElementById(`dim-${vid}`).textContent = dimText;

            // ปรับเปลี่ยนรูปแบบกรอบอัตโนมัติตามขนาด
            const isDesktop = newW >= 960;
            frame.classList.toggle('device-desktop', isDesktop);
            frame.classList.toggle('device-mobile', !isDesktop);

            const notch = document.getElementById(`notch-${vid}`);
            if (notch) {
                if (isDesktop || newW > 600) {
                    notch.classList.add('notch-hidden');
                } else {
                    notch.classList.remove('notch-hidden');
                }
            }
        };

        const onPointerUp = () => {
            document.body.classList.remove('dragging-active');
            viewWrapper.classList.remove('is-resizing');
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    });

    // เปลี่ยนอุปกรณ์จำลองเมื่อเลือก Dropdown ใหม่ (รีเซ็ตขนาดสู่รุ่นใหม่เสมอ)
    select.addEventListener('change', (e) => {
        state.views[vid].deviceKey = e.target.value;
        state.views[vid].isCustomSize = false;
        state.views[vid].isLocked = true;
        applyDeviceStyles(vid);
        updateLockBtnUI();
        if (state.isAutoFit) fitToScreen();
    });

    // หมุนหน้าจอ (สลับแนวตั้ง / แนวนอน)
    btnRot.addEventListener('click', () => {
        state.views[vid].isLandscape = !state.views[vid].isLandscape;
        applyDeviceStyles(vid);
        if (state.isAutoFit) fitToScreen();
    });

    // ปิดหน้าต่างจำลอง
    btnClose.addEventListener('click', () => {
        viewWrapper.remove();
        delete state.views[vid];
        if (state.isAutoFit) fitToScreen();
    });

    // ซ่อน Loader เมื่อโหลด iframe สำเร็จ
    iframe.addEventListener('load', () => {
        loader.classList.add('hidden');
    });

    // ปรับแต่งสไตล์และคำนวณสเกลให้พอดีหน้าจอ
    applyDeviceStyles(vid);
    updateLockBtnUI();
    if (state.isAutoFit) {
        fitToScreen();
    }
};

/**
 * อัปเดตและซิงค์ URL ไปยังทุกหน้าจอที่กำลังเปิดอยู่พร้อมแสดง Loader
 */
const syncAllUrls = () => {
    const globalUrlInput = document.getElementById('global-url-input');
    const formatted = formatUrl(globalUrlInput.value);
    if (!formatted) return;

    state.globalUrl = formatted;
    globalUrlInput.value = formatted;

    Object.keys(state.views).forEach((vid) => {
        const iframe = document.getElementById(`iframe-${vid}`);
        const loader = document.getElementById(`loader-${vid}`);
        if (iframe && loader) {
            loader.classList.remove('hidden');
            iframe.src = formatted;
        }
    });
};

/**
 * รีเฟรชหน้าเว็บของทุกหน้าจอจำลองพร้อมกัน โดยไม่ละเมิดนโยบาย Cross-Origin
 */
const refreshAllViews = () => {
    Object.keys(state.views).forEach((vid) => {
        const iframe = document.getElementById(`iframe-${vid}`);
        const loader = document.getElementById(`loader-${vid}`);
        if (iframe && loader) {
            loader.classList.remove('hidden');
            iframe.src = iframe.src;
        }
    });
};

// ==============================================================================
// 7. ฟังก์ชันจัดการ Custom Device Modal (Modal Operations)
// ==============================================================================

/**
 * เปิดหน้าต่าง Modal เพื่อเพิ่มอุปกรณ์ที่กำหนดเอง
 */
const openCustomDeviceModal = () => {
    const modal = document.getElementById('custom-device-modal');
    const modalError = document.getElementById('modal-error');
    const inputDevName = document.getElementById('input-dev-name');
    const inputDevW = document.getElementById('input-dev-w');
    const inputDevH = document.getElementById('input-dev-h');

    modalError.classList.add('hidden');
    inputDevName.value = '';
    inputDevW.value = '';
    inputDevH.value = '';
    modal.classList.add('active');
};

/**
 * ปิดหน้าต่าง Modal
 */
const closeCustomDeviceModal = () => {
    const modal = document.getElementById('custom-device-modal');
    modal.classList.remove('active');
};

/**
 * ตรวจสอบความถูกต้องและบันทึกข้อมูลอุปกรณ์ใหม่ลงในระบบและ LocalStorage
 */
const saveCustomDevice = () => {
    const inputDevName = document.getElementById('input-dev-name');
    const inputDevW = document.getElementById('input-dev-w');
    const inputDevH = document.getElementById('input-dev-h');
    const modalError = document.getElementById('modal-error');

    const name = inputDevName.value.trim();
    const w = parseInt(inputDevW.value, 10);
    const h = parseInt(inputDevH.value, 10);

    // ตรวจสอบความถูกต้องของข้อมูล (Validation)
    if (!name || isNaN(w) || isNaN(h) || w < 100 || h < 100) {
        modalError.classList.remove('hidden');
        return;
    }

    const id = `custom-${Date.now()}`;
    const type = (w >= 1000 || h >= 1000) ? 'desktop' : 'mobile';
    const hasNotch = type === 'mobile' && name.toLowerCase().includes('iphone');

    const newDevice = {
        name,
        w,
        h,
        notch: hasNotch,
        type,
        group: 'Custom'
    };

    // บันทึกลงใน State และ LocalStorage
    state.customDevices[id] = newDevice;
    state.allDevices[id] = newDevice;
    saveCustomDevicesToStorage(state.customDevices);

    // อัปเดตรายการใน Dropdown ทั้งหมดและเปิดหน้าจออุปกรณ์ใหม่ทันที
    updateAllDropdowns();
    createView(id);
    closeCustomDeviceModal();
};

// ==============================================================================
// 7.5 ฟังก์ชันระบบแชร์หน้าจอจำลอง (Workspace Sharing Operations)
// ==============================================================================

/**
 * ดึงข้อมูลสถานะปัจจุบันของ Workspace ทั้งหมดเพื่อนำไปสร้างลิงก์แชร์
 * @returns {object} ข้อมูลสถานะของหน้าจอทั้งหมดและ URL ปัจจุบัน
 */
const exportWorkspaceState = () => {
    return {
        url: state.globalUrl,
        zoom: state.zoom,
        views: Object.entries(state.views).map(([vid, v]) => ({
            deviceKey: v.deviceKey,
            w: v.w,
            h: v.h,
            x: v.x,
            y: v.y,
            isLandscape: v.isLandscape,
            isLocked: v.isLocked,
            isCustomSize: v.isCustomSize
        }))
    };
};

/**
 * สร้างลิงก์สำหรับแชร์ให้ผู้อื่น (รองรับทั้งแบบแชร์ URL ปกติ และแนบสถานะหน้าจอ)
 * @param {boolean} includeState - ต้องการแนบสถานะหน้าจอไปด้วยหรือไม่
 * @returns {string} URL สำหรับแชร์
 */
const getShareableUrl = (includeState = true) => {
    let host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || !host) {
        host = '192.168.1.112'; // IP ประจำเครื่องสำหรับคนในวง Wi-Fi
    }
    const port = window.location.port ? `:${window.location.port}` : '';
    const protocol = window.location.protocol || 'http:';
    const baseUrl = `${protocol}//${host}${port}${window.location.pathname}`;

    if (includeState) {
        const workspaceData = exportWorkspaceState();
        // เข้ารหัส Base64 รองรับภาษาไทยและอักขระพิเศษอย่างปลอดภัย
        const jsonStr = JSON.stringify(workspaceData);
        const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
        return `${baseUrl}#state=${encoded}`;
    }
    return baseUrl;
};

/**
 * ถอดรหัสและนำเข้าสถานะหน้าจอจำลองจากลิงก์แชร์
 * @param {string} rawState - ข้อมูลสถานะที่เข้ารหัส Base64
 * @returns {boolean} สำเร็จหรือไม่
 */
const importWorkspaceState = (rawState) => {
    try {
        const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(rawState))));
        const parsed = JSON.parse(jsonStr);
        if (!parsed || !Array.isArray(parsed.views) || parsed.views.length === 0) return false;

        // ล้างหน้าจอเดิมที่เปิดอยู่ทั้งหมดออก
        Object.keys(state.views).forEach((vid) => {
            const el = document.getElementById(vid);
            if (el) el.remove();
            delete state.views[vid];
        });

        // อัปเดต URL หากมีระบุมา
        if (parsed.url) {
            state.globalUrl = parsed.url;
            const input = document.getElementById('global-url-input');
            if (input) input.value = parsed.url;
        }

        // สร้างแต่ละหน้าจอกลับมาตามพิกัดและขนาดเดิม
        parsed.views.forEach((vConfig) => {
            createView(vConfig.deviceKey || 'iphone-17', vConfig);
        });

        if (parsed.zoom) {
            setZoom(parsed.zoom, false);
        } else {
            setTimeout(fitToScreen, 150);
        }
        return true;
    } catch (err) {
        console.error('ไม่สามารถโหลดสถานะจากลิงก์แชร์ได้:', err);
        return false;
    }
};

/**
 * อัปเดต URL และ QR Code ในหน้าต่าง Modal แชร์
 */
const updateShareUrlDisplay = () => {
    const checkState = document.getElementById('check-include-state');
    const inputUrl = document.getElementById('input-share-url');
    const qrImg = document.getElementById('share-qr-code');
    const lanSpan = document.getElementById('current-lan-ip');

    const includeState = checkState ? checkState.checked : true;
    const shareUrl = getShareableUrl(includeState);

    if (inputUrl) inputUrl.value = shareUrl;

    let host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || !host) {
        host = '192.168.1.112';
    }
    const port = window.location.port ? `:${window.location.port}` : '';
    if (lanSpan) lanSpan.textContent = `${host}${port}`;

    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`;
    }
};

/**
 * เปิดหน้าต่าง Modal สำหรับแชร์
 */
const openShareModal = () => {
    const modal = document.getElementById('share-modal');
    if (!modal) return;
    modal.classList.add('active');
    updateShareUrlDisplay();
};

/**
 * ปิดหน้าต่าง Modal สำหรับแชร์
 */
const closeShareModal = () => {
    const modal = document.getElementById('share-modal');
    if (modal) modal.classList.remove('active');
};

// ==============================================================================
// 8. การตั้งค่า Event Listeners และเริ่มต้นการทำงาน (Initialization)
// ==============================================================================

/**
 * ผูก Event Listeners กับปุ่มและองค์ประกอบต่างๆ บนหน้าเว็บ
 */
const setupEventListeners = () => {
    const globalUrlInput = document.getElementById('global-url-input');
    const btnSyncUrl = document.getElementById('btn-sync-url');
    const btnRefreshAll = document.getElementById('btn-refresh-all');
    const btnAddView = document.getElementById('btn-add-view');
    const btnAddDevice = document.getElementById('btn-add-device');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCloseModalX = document.getElementById('btn-close-modal-x');
    const btnSaveDevice = document.getElementById('btn-save-device');
    const modal = document.getElementById('custom-device-modal');

    // ซิงค์ URL เมื่อกดปุ่ม Go หรือกด Enter ในช่องค้นหา
    btnSyncUrl.addEventListener('click', syncAllUrls);
    globalUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') syncAllUrls();
    });

    // ปุ่มรีเฟรชหน้าเว็บทั้งหมด
    btnRefreshAll.addEventListener('click', refreshAllViews);

    // ปุ่มเพิ่มหน้าจอจำลอง (ค่าเริ่มต้นเป็น iPhone 17 Pro)
    btnAddView.addEventListener('click', () => createView('iphone-17-pro'));

    // การเปิด/ปิด และบันทึกข้อมูล Modal Custom Device
    btnAddDevice.addEventListener('click', openCustomDeviceModal);
    btnCloseModal.addEventListener('click', closeCustomDeviceModal);
    btnCloseModalX.addEventListener('click', closeCustomDeviceModal);
    btnSaveDevice.addEventListener('click', saveCustomDevice);

    // ปิด Modal Custom Device เมื่อคลิกที่พื้นหลังภายนอก
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCustomDeviceModal();
    });

    // ปุ่มเปิด/ปิด Modal สำหรับแชร์หน้าจอจำลอง
    const btnShare = document.getElementById('btn-share');
    const btnCloseShare = document.getElementById('btn-close-share');
    const btnCloseShareX = document.getElementById('btn-close-share-x');
    const shareModal = document.getElementById('share-modal');
    const btnCopyShareUrl = document.getElementById('btn-copy-share-url');
    const checkIncludeState = document.getElementById('check-include-state');
    const tabBtnWifi = document.getElementById('tab-btn-wifi');
    const tabBtnPublic = document.getElementById('tab-btn-public');
    const tabContentWifi = document.getElementById('tab-content-wifi');
    const tabContentPublic = document.getElementById('tab-content-public');

    if (btnShare) btnShare.addEventListener('click', openShareModal);
    if (btnCloseShare) btnCloseShare.addEventListener('click', closeShareModal);
    if (btnCloseShareX) btnCloseShareX.addEventListener('click', closeShareModal);
    if (shareModal) {
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) closeShareModal();
        });
    }

    // การเปิด/ปิด Modal คู่มือการใช้งาน (User Manual)
    const btnManual = document.getElementById('btn-manual');
    const manualModal = document.getElementById('manual-modal');
    const btnCloseManual = document.getElementById('btn-close-manual');
    const btnCloseManualX = document.getElementById('btn-close-manual-x');

    const openManualModal = () => {
        if (manualModal) manualModal.classList.add('active');
    };
    const closeManualModal = () => {
        if (manualModal) manualModal.classList.remove('active');
    };

    if (btnManual) btnManual.addEventListener('click', openManualModal);
    if (btnCloseManual) btnCloseManual.addEventListener('click', closeManualModal);
    if (btnCloseManualX) btnCloseManualX.addEventListener('click', closeManualModal);
    if (manualModal) {
        manualModal.addEventListener('click', (e) => {
            if (e.target === manualModal) closeManualModal();
        });
    }

    if (checkIncludeState) {
        checkIncludeState.addEventListener('change', updateShareUrlDisplay);
    }

    // ฟังก์ชันคัดลอกลิงก์แชร์
    if (btnCopyShareUrl) {
        btnCopyShareUrl.addEventListener('click', async () => {
            const inputUrl = document.getElementById('input-share-url');
            const copyText = document.getElementById('copy-btn-text');
            if (!inputUrl) return;

            try {
                await navigator.clipboard.writeText(inputUrl.value);
            } catch (err) {
                inputUrl.select();
                document.execCommand('copy');
            }

            if (copyText) {
                const prev = copyText.textContent;
                copyText.textContent = 'คัดลอกแล้ว! ✓';
                setTimeout(() => {
                    copyText.textContent = prev;
                }, 2000);
            }
        });
    }

    // แท็บสลับ Wi-Fi / เน็ตสาธารณะ
    if (tabBtnWifi && tabBtnPublic && tabContentWifi && tabContentPublic) {
        tabBtnWifi.addEventListener('click', () => {
            tabBtnWifi.className = 'flex-1 py-2 px-3 rounded-lg font-medium transition-all bg-indigo-600 text-white shadow-sm flex items-center justify-center gap-1.5';
            tabBtnPublic.className = 'flex-1 py-2 px-3 rounded-lg font-medium transition-all text-gray-400 hover:text-gray-200 flex items-center justify-center gap-1.5';
            tabContentWifi.classList.remove('hidden');
            tabContentPublic.classList.add('hidden');
        });

        tabBtnPublic.addEventListener('click', () => {
            tabBtnPublic.className = 'flex-1 py-2 px-3 rounded-lg font-medium transition-all bg-indigo-600 text-white shadow-sm flex items-center justify-center gap-1.5';
            tabBtnWifi.className = 'flex-1 py-2 px-3 rounded-lg font-medium transition-all text-gray-400 hover:text-gray-200 flex items-center justify-center gap-1.5';
            tabContentPublic.classList.remove('hidden');
            tabContentWifi.classList.add('hidden');
        });
    }

    // ปุ่มลัดเปลี่ยนเป็นเว็บตัวอย่าง Demo Store
    const btnPresetDemo = document.getElementById('btn-preset-demo');
    if (btnPresetDemo) {
        btnPresetDemo.addEventListener('click', () => {
            globalUrlInput.value = 'demo.html';
            syncAllUrls();
        });
    }

    // ปุ่มลัดเปลี่ยนเป็น Wikipedia
    const btnPresetWiki = document.getElementById('btn-preset-wiki');
    if (btnPresetWiki) {
        btnPresetWiki.addEventListener('click', () => {
            globalUrlInput.value = 'https://en.m.wikipedia.org';
            syncAllUrls();
        });
    }

    // ระบบปรับสเกลขนาดหน้าจอ (Zoom Controls)
    const selectZoom = document.getElementById('select-zoom');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomFit = document.getElementById('btn-zoom-fit');
    const zoomLevels = [0.4, 0.5, 0.6, 0.7, 0.75, 0.85, 1.0];

    if (selectZoom) {
        selectZoom.addEventListener('change', (e) => {
            if (e.target.value === 'fit') {
                fitToScreen();
            } else {
                setZoom(parseFloat(e.target.value), true);
            }
        });
    }

    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => {
            const next = zoomLevels.find((z) => z > state.zoom + 0.02) || 1.0;
            setZoom(next, true);
        });
    }

    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
            const prev = [...zoomLevels].reverse().find((z) => z < state.zoom - 0.02) || 0.4;
            setZoom(prev, true);
        });
    }

    if (btnZoomFit) {
        btnZoomFit.addEventListener('click', () => fitToScreen());
    }

    // ปุ่มจัดเรียงหน้าต่างทุกเครื่องให้เรียงแถวกันอัตโนมัติ
    const btnAlignViews = document.getElementById('btn-align-views');
    if (btnAlignViews) {
        btnAlignViews.addEventListener('click', () => alignViewsInRow());
    }

    // ปรับสเกลอัตโนมัติเมื่อผู้ใช้ย่อ/ขยายหน้าต่างเบราว์เซอร์
    window.addEventListener('resize', () => {
        if (state.isAutoFit) {
            fitToScreen();
        }
    });
};

/**
 * ฟังก์ชันหลักในการเริ่มระบบ (Entry Point)
 */
const init = () => {
    // โหลดข้อมูล Custom Devices จาก Storage
    state.customDevices = loadCustomDevices();
    state.allDevices = { ...DEFAULT_DEVICES, ...state.customDevices };

    // ผูก Event Listeners
    setupEventListeners();

    // ตรวจสอบว่าเปิดผ่านลิงก์แชร์ที่มี State หรือไม่
    let loadedFromShare = false;
    const hash = window.location.hash;
    if (hash && hash.includes('state=')) {
        const rawState = hash.split('state=')[1];
        if (rawState) {
            loadedFromShare = importWorkspaceState(rawState);
        }
    }

    // หากไม่ได้เปิดจากลิงก์แชร์ ให้เปิดหน้าจอเริ่มต้น: iPhone 17 และ Desktop 1080p
    if (!loadedFromShare) {
        createView('iphone-17');
        createView('desktop-1080p');

        // คำนวณและปรับขนาดอัตโนมัติให้พอดีกับหน้าจอของผู้ใช้ทันที
        setTimeout(() => {
            fitToScreen();
        }, 150);
    }
};

// เริ่มการทำงานเมื่อ DOM โหลดเสร็จสมบูรณ์
document.addEventListener('DOMContentLoaded', init);
