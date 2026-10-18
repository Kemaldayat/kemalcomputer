/**
 * PC Builder & Simulasi Rakit PC Module
 * Kemal Computer - Real-time Price, Mix Condition (New & Second), Wattage Estimator
 */

import { db, dbRef as ref, onValue } from "./firebase-config.js";

// Master Komponen Default (Katalog Komprehensif Pasar Komputer Indonesia)
export const DEFAULT_COMPONENTS = {
    cpu: {
        categoryName: "Processor (CPU)",
        icon: "fa-microchip",
        items: [
            { id: "cpu_0", nama: "-- Pilih Processor --", hargaNew: 0, hargaSecond: 0, wattage: 0, socket: "" },
            { id: "cpu_1", nama: "Intel Core i3-10105F (4C/8T up to 4.4GHz)", hargaNew: 1250000, hargaSecond: 850000, wattage: 65, socket: "LGA1200", ramType: "DDR4" },
            { id: "cpu_2", nama: "Intel Core i5-10400F (6C/12T up to 4.3GHz)", hargaNew: 1950000, hargaSecond: 1350000, wattage: 65, socket: "LGA1200", ramType: "DDR4" },
            { id: "cpu_3", nama: "Intel Core i3-12100F (4C/8T up to 4.3GHz)", hargaNew: 1550000, hargaSecond: 1150000, wattage: 60, socket: "LGA1700", ramType: "DDR4" },
            { id: "cpu_4", nama: "Intel Core i5-12400F (6C/12T up to 4.4GHz)", hargaNew: 2250000, hargaSecond: 1650000, wattage: 65, socket: "LGA1700", ramType: "DDR4" },
            { id: "cpu_5", nama: "Intel Core i5-13400F (10C/16T up to 4.6GHz)", hargaNew: 3650000, hargaSecond: 2750000, wattage: 65, socket: "LGA1700", ramType: "DDR4" },
            { id: "cpu_6", nama: "AMD Ryzen 5 3600 (6C/12T up to 4.2GHz)", hargaNew: 1550000, hargaSecond: 1100000, wattage: 65, socket: "AM4", ramType: "DDR4" },
            { id: "cpu_7", nama: "AMD Ryzen 5 5600 (6C/12T up to 4.4GHz)", hargaNew: 2150000, hargaSecond: 1550000, wattage: 65, socket: "AM4", ramType: "DDR4" },
            { id: "cpu_8", nama: "AMD Ryzen 7 5700X (8C/16T up to 4.6GHz)", hargaNew: 3150000, hargaSecond: 2350000, wattage: 65, socket: "AM4", ramType: "DDR4" },
            { id: "cpu_9", nama: "AMD Ryzen 5 7500F (6C/12T Zen 4 AM5)", hargaNew: 3150000, hargaSecond: 2450000, wattage: 65, socket: "AM5", ramType: "DDR5" }
        ]
    },
    mobo: {
        categoryName: "Motherboard (Mobo)",
        icon: "fa-server",
        items: [
            { id: "mobo_0", nama: "-- Pilih Motherboard --", hargaNew: 0, hargaSecond: 0, socket: "" },
            { id: "mobo_1", nama: "H510M Socket LGA1200 DDR4", hargaNew: 1150000, hargaSecond: 750000, socket: "LGA1200", ramType: "DDR4" },
            { id: "mobo_2", nama: "H610M Socket LGA1700 DDR4", hargaNew: 1350000, hargaSecond: 950000, socket: "LGA1700", ramType: "DDR4" },
            { id: "mobo_3", nama: "B660M / B760M Gaming Socket LGA1700 DDR4", hargaNew: 2150000, hargaSecond: 1450000, socket: "LGA1700", ramType: "DDR4" },
            { id: "mobo_4", nama: "A520M / A320M Socket AM4 DDR4", hargaNew: 1050000, hargaSecond: 650000, socket: "AM4", ramType: "DDR4" },
            { id: "mobo_5", nama: "B450M / B550M Gaming Socket AM4 DDR4", hargaNew: 1650000, hargaSecond: 1050000, socket: "AM4", ramType: "DDR4" },
            { id: "mobo_6", nama: "B650M Gaming Socket AM5 DDR5", hargaNew: 2550000, hargaSecond: 1850000, socket: "AM5", ramType: "DDR5" }
        ]
    },
    ram: {
        categoryName: "Memory (RAM)",
        icon: "fa-memory",
        items: [
            { id: "ram_0", nama: "-- Pilih RAM --", hargaNew: 0, hargaSecond: 0 },
            { id: "ram_1", nama: "8GB DDR4 3200MHz (1x8GB Single Channel)", hargaNew: 380000, hargaSecond: 240000, ramType: "DDR4" },
            { id: "ram_2", nama: "16GB DDR4 3200MHz (2x8GB Dual Channel)", hargaNew: 750000, hargaSecond: 480000, ramType: "DDR4" },
            { id: "ram_3", nama: "32GB DDR4 3200MHz (2x16GB Dual Channel)", hargaNew: 1450000, hargaSecond: 950000, ramType: "DDR4" },
            { id: "ram_4", nama: "16GB DDR5 5600MHz (2x8GB / 1x16GB)", hargaNew: 1150000, hargaSecond: 780000, ramType: "DDR5" },
            { id: "ram_5", nama: "32GB DDR5 6000MHz (2x16GB Dual Channel RGB)", hargaNew: 2250000, hargaSecond: 1550000, ramType: "DDR5" }
        ]
    },
    vga: {
        categoryName: "Kartu Grafis (VGA / GPU)",
        icon: "fa-gamepad",
        items: [
            { id: "vga_0", nama: "Onboard Graphic (Tanpa VGA Card / Khusus Office)", hargaNew: 0, hargaSecond: 0, wattage: 0 },
            { id: "vga_1", nama: "AMD Radeon RX 580 8GB GDDR5", hargaNew: 0, hargaSecond: 1250000, wattage: 150, onlySecond: true },
            { id: "vga_2", nama: "GeForce GTX 1650 4GB GDDR6", hargaNew: 2450000, hargaSecond: 1550000, wattage: 75 },
            { id: "vga_3", nama: "GeForce GTX 1660 Super 6GB GDDR6", hargaNew: 3350000, hargaSecond: 1950000, wattage: 125 },
            { id: "vga_4", nama: "AMD Radeon RX 6600 8GB GDDR6", hargaNew: 3750000, hargaSecond: 2650000, wattage: 132 },
            { id: "vga_5", nama: "GeForce RTX 3060 12GB GDDR6", hargaNew: 5250000, hargaSecond: 3850000, wattage: 170 },
            { id: "vga_6", nama: "GeForce RTX 4060 8GB GDDR6", hargaNew: 5850000, hargaSecond: 4650000, wattage: 115 },
            { id: "vga_7", nama: "GeForce RTX 4070 12GB GDDR6X", hargaNew: 10950000, hargaSecond: 8450000, wattage: 200 }
        ]
    },
    ssd: {
        categoryName: "Penyimpanan Utama (SSD)",
        icon: "fa-hdd",
        items: [
            { id: "ssd_0", nama: "-- Pilih SSD Utama --", hargaNew: 0, hargaSecond: 0 },
            { id: "ssd_1", nama: "SSD SATA 256GB 2.5 Inch", hargaNew: 350000, hargaSecond: 220000 },
            { id: "ssd_2", nama: "SSD NVMe M.2 256GB PCIe Gen 3", hargaNew: 450000, hargaSecond: 280000 },
            { id: "ssd_3", nama: "SSD NVMe M.2 512GB PCIe Gen 4 High Speed", hargaNew: 750000, hargaSecond: 490000 },
            { id: "ssd_4", nama: "SSD NVMe M.2 1TB PCIe Gen 4 Ultra Fast", hargaNew: 1350000, hargaSecond: 890000 }
        ]
    },
    extraStorage: {
        categoryName: "Penyimpanan Tambahan (Opsional)",
        icon: "fa-database",
        items: [
            { id: "extra_0", nama: "Tanpa Tambahan Storage", hargaNew: 0, hargaSecond: 0 },
            { id: "extra_1", nama: "HDD 500GB 7200RPM (Seagate/WD Blue)", hargaNew: 320000, hargaSecond: 160000 },
            { id: "extra_2", nama: "HDD 1TB 7200RPM (Seagate/WD Blue)", hargaNew: 680000, hargaSecond: 350000 },
            { id: "extra_3", nama: "HDD 2TB 7200RPM (Seagate Barracuda)", hargaNew: 1050000, hargaSecond: 580000 },
            { id: "extra_4", nama: "Extra SSD SATA 512GB 2.5 Inch", hargaNew: 620000, hargaSecond: 420000 }
        ]
    },
    psu: {
        categoryName: "Power Supply (PSU)",
        icon: "fa-bolt",
        items: [
            { id: "psu_0", nama: "-- Pilih Power Supply --", hargaNew: 0, hargaSecond: 0, capacity: 0 },
            { id: "psu_1", nama: "PSU Standar 450W / 500W (Khusus Office Non-VGA)", hargaNew: 280000, hargaSecond: 160000, capacity: 450 },
            { id: "psu_2", nama: "PSU 500W 80+ Bronze Certified (FSP / DeepCool)", hargaNew: 680000, hargaSecond: 450000, capacity: 500 },
            { id: "psu_3", nama: "PSU 550W - 600W 80+ Bronze Certified", hargaNew: 820000, hargaSecond: 520000, capacity: 600 },
            { id: "psu_4", nama: "PSU 650W 80+ Bronze/Gold (MSI MAG / Corsair)", hargaNew: 1150000, hargaSecond: 780000, capacity: 650 },
            { id: "psu_5", nama: "PSU 750W 80+ Gold Modular", hargaNew: 1750000, hargaSecond: 1150000, capacity: 750 }
        ]
    },
    casing: {
        categoryName: "Casing PC",
        icon: "fa-cube",
        items: [
            { id: "case_0", nama: "-- Pilih Casing PC --", hargaNew: 0, hargaSecond: 0 },
            { id: "case_1", nama: "Casing Standar Office (Black Minimalist)", hargaNew: 250000, hargaSecond: 120000 },
            { id: "case_2", nama: "Casing Gaming Mid-Tower RGB (Termasuk 3 Fan)", hargaNew: 480000, hargaSecond: 290000 },
            { id: "case_3", nama: "Casing Tempered Glass Modern + 4 Fan ARGB", hargaNew: 650000, hargaSecond: 420000 },
            { id: "case_4", nama: "Casing Panoramic Aquarium Dual Tempered Glass", hargaNew: 790000, hargaSecond: 490000 }
        ]
    },
    cooler: {
        categoryName: "CPU Cooler (Pendingin)",
        icon: "fa-fan",
        items: [
            { id: "cooler_0", nama: "Stock Cooler Bawaan Processor (Gratis)", hargaNew: 0, hargaSecond: 0 },
            { id: "cooler_1", nama: "Air Cooler Single Tower 4 Heatpipe RGB", hargaNew: 280000, hargaSecond: 160000 },
            { id: "cooler_2", nama: "Air Cooler Dual Tower 6 Heatpipe Heavy Duty", hargaNew: 580000, hargaSecond: 380000 },
            { id: "cooler_3", nama: "Liquid Cooler AIO 240mm ARGB Water Cooling", hargaNew: 950000, hargaSecond: 580000 }
        ]
    },
    aksesori: {
        categoryName: "Aksesori & Monitor (Opsional)",
        icon: "fa-tv",
        items: [
            { id: "aks_0", nama: "Tanpa Aksesori Tambahan", hargaNew: 0, hargaSecond: 0 },
            { id: "aks_1", nama: "USB Wifi Dongle + Bluetooth 5.0", hargaNew: 95000, hargaSecond: 55000 },
            { id: "aks_2", nama: "PCIe Wifi Dual Band Antena Luar + Bluetooth", hargaNew: 245000, hargaSecond: 160000 },
            { id: "aks_3", nama: "Monitor 22 Inch 75Hz Full HD IPS", hargaNew: 1350000, hargaSecond: 850000 },
            { id: "aks_4", nama: "Monitor Gaming 24 Inch 100Hz-180Hz IPS Full HD", hargaNew: 1950000, hargaSecond: 1350000 },
            { id: "aks_5", nama: "Combo Keyboard & Mouse RGB Gaming", hargaNew: 185000, hargaSecond: 95000 }
        ]
    }
};


// Preset Paket Racikan
export const PRESETS = {
    office: {
        nama: "Paket Office & Kasir Hemat",
        deskripsi: "Cocok untuk administrasi kantor, kasir, belajar, & browsing cepat.",
        parts: {
            cpu: { id: "cpu_1", condition: "second" },
            mobo: { id: "mobo_1", condition: "second" },
            ram: { id: "ram_1", condition: "second" },
            vga: { id: "vga_0", condition: "new" },
            ssd: { id: "ssd_1", condition: "new" },
            extraStorage: { id: "extra_0", condition: "new" },
            psu: { id: "psu_1", condition: "new" },
            casing: { id: "case_1", condition: "new" },
            cooler: { id: "cooler_0", condition: "new" },
            aksesori: { id: "aks_0", condition: "new" }
        }
    },
    gaming_budget: {
        nama: "Paket Gaming Budget 1080p",
        deskripsi: "Favorit e-Sports! Lancar Valorant, GTA V, Dota 2, CS2, & Genshin Impact.",
        parts: {
            cpu: { id: "cpu_6", condition: "second" },
            mobo: { id: "mobo_4", condition: "second" },
            ram: { id: "ram_2", condition: "new" },
            vga: { id: "vga_3", condition: "second" },
            ssd: { id: "ssd_3", condition: "new" },
            extraStorage: { id: "extra_0", condition: "new" },
            psu: { id: "psu_2", condition: "new" },
            casing: { id: "case_2", condition: "new" },
            cooler: { id: "cooler_0", condition: "new" },
            aksesori: { id: "aks_0", condition: "new" }
        }
    },
    gaming_streamer: {
        nama: "Paket Gaming & Render Populer",
        deskripsi: "Performa tinggi untuk Game AAA, Adobe Premiere, Blender, dan Streaming.",
        parts: {
            cpu: { id: "cpu_4", condition: "new" },
            mobo: { id: "mobo_2", condition: "new" },
            ram: { id: "ram_2", condition: "new" },
            vga: { id: "vga_5", condition: "second" },
            ssd: { id: "ssd_3", condition: "new" },
            extraStorage: { id: "extra_0", condition: "new" },
            psu: { id: "psu_3", condition: "new" },
            casing: { id: "case_3", condition: "new" },
            cooler: { id: "cooler_1", condition: "new" },
            aksesori: { id: "aks_0", condition: "new" }
        }
    },
    all_new_high: {
        nama: "Paket All New High Performance",
        deskripsi: "Semua komponen 100% Baru garansi resmi panjang, siap libas tugas berat.",
        parts: {
            cpu: { id: "cpu_5", condition: "new" },
            mobo: { id: "mobo_3", condition: "new" },
            ram: { id: "ram_3", condition: "new" },
            vga: { id: "vga_6", condition: "new" },
            ssd: { id: "ssd_4", condition: "new" },
            extraStorage: { id: "extra_0", condition: "new" },
            psu: { id: "psu_4", condition: "new" },
            casing: { id: "case_4", condition: "new" },
            cooler: { id: "cooler_3", condition: "new" },
            aksesori: { id: "aks_0", condition: "new" }
        }
    }
};

class PCBuilderController {
    constructor() {
        this.componentsData = JSON.parse(JSON.stringify(DEFAULT_COMPONENTS));
        this.catalogUnsubscribe = null;
        this.selectedParts = {};
        this.services = {
            jasaRakit: true,
            installOs: true
        };
        this.biayaJasaRakit = 75000;
        this.biayaInstallOs = 50000;
        this.promoGratisJasa = true; // Promo default: Gratis rakit & OS

        // Initialize state
        this.initSelectedParts();
    }

    initSelectedParts() {
        Object.keys(this.componentsData).forEach(cat => {
            this.selectedParts[cat] = {
                id: `${cat}_0`,
                condition: "new"
            };
        });
    }

    init() {
        this.renderCategorySlots();
        this.recalculate();

        if (this.catalogUnsubscribe) return;

        this.catalogUnsubscribe = onValue(
            ref(db, "komponen_rakit"),
            snapshot => {
                const nextComponents = JSON.parse(JSON.stringify(DEFAULT_COMPONENTS));
                const fbData = snapshot.exists() ? snapshot.val() : null;

                if (fbData && typeof fbData === "object") {
                    Object.keys(nextComponents).forEach(catKey => {
                        const categoryData = fbData[catKey];
                        if (!categoryData || typeof categoryData !== "object") return;

                        const items = Array.isArray(categoryData.items)
                            ? categoryData.items
                            : Array.isArray(categoryData)
                                ? categoryData
                                : null;

                        if (items) nextComponents[catKey].items = items;
                    });
                }

                this.componentsData = nextComponents;
                Object.keys(this.selectedParts).forEach(catKey => {
                    const items = this.componentsData[catKey].items;
                    if (!items.some(item => item.id === this.selectedParts[catKey].id)) {
                        this.selectedParts[catKey] = {
                            id: items[0]?.id || `${catKey}_0`,
                            condition: "new"
                        };
                    }
                });

                this.renderCategorySlots();
                this.recalculate();
            },
            error => {
                console.error("Gagal memuat komponen_rakit dari Firebase; katalog default tetap digunakan:", error);
            }
        );
    }

    renderCategorySlots() {
        const container = document.getElementById("builder-parts-list");
        if (!container) return;

        container.innerHTML = Object.keys(this.componentsData).map(catKey => {
            const cat = this.componentsData[catKey];
            const currentSelected = this.selectedParts[catKey] || { id: `${catKey}_0`, condition: "new" };
            const currentItem = cat.items.find(i => i.id === currentSelected.id) || cat.items[0];

            return `
            <div class="part-slot-card ${currentItem.hargaNew > 0 || currentItem.hargaSecond > 0 ? 'has-selected' : ''}" id="card-slot-${catKey}">
                <div class="part-slot-header">
                    <div class="part-slot-title">
                        <div class="part-slot-icon"><i class="fas ${cat.icon}"></i></div>
                        <span>${cat.categoryName}</span>
                    </div>
                    ${currentItem.hargaNew > 0 || currentItem.hargaSecond > 0 ? `
                        <button type="button" class="part-slot-reset" onclick="window.pcBuilder.resetSlot('${catKey}')" title="Reset slot ini">
                            <i class="fas fa-undo"></i> Reset
                        </button>
                    ` : ''}
                </div>

                <div class="part-select-wrapper">
                    <select class="part-select-input" onchange="window.pcBuilder.handleSelectPart('${catKey}', this.value)" id="select-${catKey}">
                        ${cat.items.map(item => `
                            <option value="${item.id}" ${item.id === currentSelected.id ? 'selected' : ''}>
                                ${item.nama}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="part-controls-row" id="controls-${catKey}" style="${(currentItem.hargaNew === 0 && currentItem.hargaSecond === 0) ? 'display: none;' : ''}">
                    <div class="condition-toggle-group">
                        <button type="button" 
                            class="condition-toggle-btn btn-new ${currentSelected.condition === 'new' ? 'active' : ''}" 
                            onclick="window.pcBuilder.setCondition('${catKey}', 'new')"
                            ${itemHasNew(currentItem) ? '' : 'disabled title="Hanya tersedia Second"'}
                        >
                            <i class="fas fa-check-circle"></i> Baru
                        </button>
                        <button type="button" 
                            class="condition-toggle-btn btn-second ${currentSelected.condition === 'second' ? 'active' : ''}" 
                            onclick="window.pcBuilder.setCondition('${catKey}', 'second')"
                            ${itemHasSecond(currentItem) ? '' : 'disabled title="Hanya tersedia Baru"'}
                        >
                            <i class="fas fa-history"></i> Second
                        </button>
                    </div>

                    <div style="text-align: right;">
                        <div class="part-price-tag" id="price-tag-${catKey}">
                            ${this.formatItemPrice(currentItem, currentSelected.condition)}
                        </div>
                        <span class="part-warranty-chip" id="warranty-${catKey}">
                            ${this.getWarrantyText(currentItem, currentSelected.condition)}
                        </span>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    handleSelectPart(catKey, itemId) {
        const cat = this.componentsData[catKey];
        const item = cat.items.find(i => i.id === itemId);
        if (!item) return;

        // Auto pilih kondisi yang tersedia
        let cond = this.selectedParts[catKey]?.condition || "new";
        if (item.onlySecond || (!itemHasNew(item) && itemHasSecond(item))) {
            cond = "second";
        } else if (!itemHasSecond(item) && itemHasNew(item)) {
            cond = "new";
        }

        this.selectedParts[catKey] = { id: itemId, condition: cond };
        this.updateSlotUI(catKey);
        this.recalculate();
    }

    setCondition(catKey, condition) {
        if (!this.selectedParts[catKey]) return;
        this.selectedParts[catKey].condition = condition;
        this.updateSlotUI(catKey);
        this.recalculate();
    }

    resetSlot(catKey) {
        this.selectedParts[catKey] = { id: `${catKey}_0`, condition: "new" };
        const selectEl = document.getElementById(`select-${catKey}`);
        if (selectEl) selectEl.value = `${catKey}_0`;
        this.updateSlotUI(catKey);
        this.recalculate();
    }

    updateSlotUI(catKey) {
        const cat = this.componentsData[catKey];
        const currentSelected = this.selectedParts[catKey];
        const currentItem = cat.items.find(i => i.id === currentSelected.id) || cat.items[0];

        const card = document.getElementById(`card-slot-${catKey}`);
        const controls = document.getElementById(`controls-${catKey}`);
        const priceTag = document.getElementById(`price-tag-${catKey}`);
        const warranty = document.getElementById(`warranty-${catKey}`);
        const selectEl = document.getElementById(`select-${catKey}`);

        if (selectEl) selectEl.value = currentSelected.id;

        const isChosen = (currentItem.hargaNew > 0 || currentItem.hargaSecond > 0);
        if (card) {
            if (isChosen) card.classList.add("has-selected");
            else card.classList.remove("has-selected");
        }

        if (controls) {
            controls.style.display = isChosen ? "flex" : "none";
            const btnNew = controls.querySelector(".btn-new");
            const btnSecond = controls.querySelector(".btn-second");

            if (btnNew) {
                btnNew.classList.toggle("active", currentSelected.condition === "new");
                btnNew.disabled = !itemHasNew(currentItem);
            }
            if (btnSecond) {
                btnSecond.classList.toggle("active", currentSelected.condition === "second");
                btnSecond.disabled = !itemHasSecond(currentItem);
            }
        }

        if (priceTag) priceTag.innerHTML = this.formatItemPrice(currentItem, currentSelected.condition);
        if (warranty) warranty.innerText = this.getWarrantyText(currentItem, currentSelected.condition);
    }

    formatItemPrice(item, condition) {
        if (!item || (item.hargaNew === 0 && item.hargaSecond === 0)) return "Rp 0";
        const price = condition === "second" ? item.hargaSecond : item.hargaNew;
        if (!price || price === 0) return "<span style='font-size:0.85rem; color:var(--color-text-muted);'>N/A</span>";
        return `Rp ${price.toLocaleString("id-ID")}`;
    }

    getWarrantyText(item, condition) {
        if (!item || (item.hargaNew === 0 && item.hargaSecond === 0)) return "";
        if (condition === "second") {
            return item.garansiSecond || "🛡️ Garansi Toko 1 Bulan (QC Passed)";
        }
        return item.garansiNew || "🛡️ Garansi Resmi 1-3 Tahun";
    }

    recalculate() {
        let subtotalNew = 0;
        let subtotalSecond = 0;
        let hypotheticalAllNewTotal = 0;
        let totalWattage = 50; // Baseline mobo, ram, fans, drives
        let selectedPsuWattage = 0;
        let selectedCount = 0;
        const selectedItemsForSummary = [];

        Object.keys(this.selectedParts).forEach(catKey => {
            const cat = this.componentsData[catKey];
            const sel = this.selectedParts[catKey];
            const item = cat.items.find(i => i.id === sel.id);

            if (item && (item.hargaNew > 0 || item.hargaSecond > 0)) {
                selectedCount++;
                const isSecond = sel.condition === "second";
                const price = isSecond ? item.hargaSecond : item.hargaNew;

                if (isSecond) {
                    subtotalSecond += price;
                } else {
                    subtotalNew += price;
                }

                // Kalkulasi harga jika seandainya beli New semua untuk perbandingan hemat
                hypotheticalAllNewTotal += item.hargaNew > 0 ? item.hargaNew : (item.hargaSecond * 1.35);

                // Tambahkan Wattage
                if (item.wattage) totalWattage += item.wattage;
                if (catKey === "psu" && item.capacity) selectedPsuWattage = item.capacity;

                selectedItemsForSummary.push({
                    catName: cat.categoryName,
                    nama: item.nama,
                    condition: sel.condition,
                    price: price
                });
            }
        });

        // Biaya Jasa & Services
        let biayaLayanan = 0;
        if (!this.promoGratisJasa) {
            if (this.services.jasaRakit) biayaLayanan += this.biayaJasaRakit;
            if (this.services.installOs) biayaLayanan += this.biayaInstallOs;
        }

        const grandTotal = subtotalNew + subtotalSecond + biayaLayanan;
        const totalSavings = Math.max(0, hypotheticalAllNewTotal - (subtotalNew + subtotalSecond));

        // Update Summary DOM
        this.updateSummaryUI({
            subtotalNew,
            subtotalSecond,
            biayaLayanan,
            grandTotal,
            totalSavings,
            totalWattage,
            selectedPsuWattage,
            selectedCount,
            selectedItemsForSummary
        });
    }

    updateSummaryUI(data) {
        // Counter Badge
        const counter = document.getElementById("summary-counter");
        if (counter) counter.innerText = `${data.selectedCount} Komponen`;

        // Subtotals
        const subNewEl = document.getElementById("summary-subtotal-new");
        if (subNewEl) subNewEl.innerText = `Rp ${data.subtotalNew.toLocaleString("id-ID")}`;

        const subSecEl = document.getElementById("summary-subtotal-second");
        if (subSecEl) subSecEl.innerText = `Rp ${data.subtotalSecond.toLocaleString("id-ID")}`;

        // Grand Total
        const totalEl = document.getElementById("summary-grand-total");
        if (totalEl) totalEl.innerText = `Rp ${data.grandTotal.toLocaleString("id-ID")}`;

        const mobileTotalEl = document.getElementById("mobile-bar-total");
        if (mobileTotalEl) mobileTotalEl.innerText = `Rp ${data.grandTotal.toLocaleString("id-ID")}`;

        // Mobile builder bar display
        const mobileBar = document.getElementById("mobile-builder-bar");
        if (mobileBar) {
            if (data.selectedCount > 0) mobileBar.classList.add("show");
            else mobileBar.classList.remove("show");
        }

        // Savings Callout
        const savingsBox = document.getElementById("summary-savings-box");
        const savingsAmount = document.getElementById("summary-savings-amount");
        if (savingsBox && savingsAmount) {
            if (data.totalSavings >= 50000 && data.subtotalSecond > 0) {
                savingsBox.classList.add("show");
                savingsAmount.innerText = `Rp ${Math.round(data.totalSavings).toLocaleString("id-ID")}`;
            } else {
                savingsBox.classList.remove("show");
            }
        }

        // Composition Progress Bar
        const compTotal = data.subtotalNew + data.subtotalSecond;
        const pctNew = compTotal > 0 ? Math.round((data.subtotalNew / compTotal) * 100) : 0;
        const pctSec = compTotal > 0 ? (100 - pctNew) : 0;

        const barNew = document.getElementById("comp-bar-new");
        const barSec = document.getElementById("comp-bar-second");
        const labelNew = document.getElementById("comp-label-new");
        const labelSec = document.getElementById("comp-label-second");

        if (barNew && barSec) {
            barNew.style.width = `${pctNew}%`;
            barSec.style.width = `${pctSec}%`;
        }
        if (labelNew) labelNew.innerText = `Baru: ${pctNew}%`;
        if (labelSec) labelSec.innerText = `Second: ${pctSec}%`;

        // Wattage & PSU Recommendation
        const wattEl = document.getElementById("summary-wattage");
        const psuRecEl = document.getElementById("summary-psu-rec");
        const psuWarnEl = document.getElementById("summary-psu-warning");

        const recommendedPsu = Math.ceil((data.totalWattage * 1.35) / 50) * 50; // min +35% headroom
        if (wattEl) wattEl.innerText = `± ${data.totalWattage} Watt`;
        if (psuRecEl) psuRecEl.innerText = `Minimal ${recommendedPsu}W 80+`;

        if (psuWarnEl) {
            if (data.selectedPsuWattage > 0 && data.selectedPsuWattage < recommendedPsu) {
                psuWarnEl.style.display = "block";
                psuWarnEl.innerText = `⚠️ PSU pilihan Anda (${data.selectedPsuWattage}W) di bawah anjuran (${recommendedPsu}W). Disarankan pilih kapasitas lebih besar demi kestabilan & keawetan.`;
            } else {
                psuWarnEl.style.display = "none";
            }
        }

        // Render List Ringkasan
        const itemsList = document.getElementById("summary-items-list");
        if (itemsList) {
            if (data.selectedItemsForSummary.length === 0) {
                itemsList.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 1.5rem 0; font-size: 0.85rem;">Belum ada komponen dipilih.<br>Silakan pilih komponen di samping.</div>`;
            } else {
                itemsList.innerHTML = data.selectedItemsForSummary.map(item => `
                    <div class="summary-item-row">
                        <div class="summary-item-name">
                            <span class="summary-item-badge ${item.condition === 'new' ? 'badge-new' : 'badge-second'}">
                                ${item.condition === 'new' ? 'BARU' : 'SECOND'}
                            </span>
                            ${item.nama}
                        </div>
                        <div class="summary-item-price">Rp ${item.price.toLocaleString("id-ID")}</div>
                    </div>
                `).join('');
            }
        }
    }

    applyPreset(presetKey) {
        const preset = PRESETS[presetKey];
        if (!preset) return;

        // Set parts
        Object.keys(preset.parts).forEach(catKey => {
            if (this.componentsData[catKey]) {
                this.selectedParts[catKey] = {
                    id: preset.parts[catKey].id,
                    condition: preset.parts[catKey].condition
                };
            }
        });

        // Update UI
        Object.keys(this.componentsData).forEach(catKey => {
            this.updateSlotUI(catKey);
        });

        // Set active preset button
        document.querySelectorAll(".preset-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.preset === presetKey);
        });

        this.recalculate();

        if (window.showSweetAlert) {
            window.showSweetAlert(`Preset "${preset.nama}" diterapkan!`, "success");
        }
    }

    resetAll() {
        this.initSelectedParts();
        Object.keys(this.componentsData).forEach(catKey => {
            this.updateSlotUI(catKey);
        });
        document.querySelectorAll(".preset-btn").forEach(btn => btn.classList.remove("active"));
        this.recalculate();
    }

    toggleService(serviceKey, isChecked) {
        this.services[serviceKey] = isChecked;
        this.recalculate();
    }

    generateWhatsAppOrder() {
        const waNumber = window.tokoSettings?.whatsapp || window.globalWaNumber;
        if (!waNumber) {
            if (window.showSweetAlert) window.showSweetAlert("Nomor WhatsApp Toko belum disetel admin.", "info");
            else alert("Nomor WhatsApp Toko belum disetel admin.");
            return;
        }

        let partsListText = "";
        let count = 0;
        let subNew = 0;
        let subSec = 0;
        let totalWatt = 50;

        Object.keys(this.selectedParts).forEach(catKey => {
            const cat = this.componentsData[catKey];
            const sel = this.selectedParts[catKey];
            const item = cat.items.find(i => i.id === sel.id);

            if (item && (item.hargaNew > 0 || item.hargaSecond > 0)) {
                count++;
                const isSec = sel.condition === "second";
                const price = isSec ? item.hargaSecond : item.hargaNew;
                if (isSec) subSec += price;
                else subNew += price;
                if (item.wattage) totalWatt += item.wattage;

                partsListText += `${count}. *${cat.categoryName}:*\n   ${item.nama} [${isSec ? 'SECOND' : 'BARU'}] - Rp ${price.toLocaleString('id-ID')}\n`;
            }
        });

        if (count === 0) {
            if (window.showSweetAlert) window.showSweetAlert("Silakan pilih minimal 1 komponen sebelum memesan.", "warning");
            else alert("Silakan pilih minimal 1 komponen sebelum memesan.");
            return;
        }

        const grandTotal = subNew + subSec;
        const textMessage = 
`Halo Admin Kemal Computer, saya tertarik untuk rakit PC dengan racikan kustom dari website:

📋 *DAFTAR KOMPONEN:*
${partsListText}
📊 *RINGKASAN ESTIMASI BIAYA:*
- Subtotal Part Baru: Rp ${subNew.toLocaleString('id-ID')}
- Subtotal Part Second: Rp ${subSec.toLocaleString('id-ID')}
- Jasa Rakit & Install OS: ${this.promoGratisJasa ? 'GRATIS (Promo)' : 'Tercakup'}
💰 *TOTAL ESTIMASI: Rp ${grandTotal.toLocaleString('id-ID')}*
⚡ *Estimasi Daya:* ± ${totalWatt} Watt

Apakah semua part di atas ready stok? Mohon konfirmasi ketersediaan dan proses perakitannya. Terima kasih!`;

        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(textMessage)}`;
        window.open(waUrl, "_blank");
    }

    copySpecification() {
        let text = "=== ESTIMASI SIMULASI RAKIT PC - KEMAL COMPUTER ===\n\n";
        let subNew = 0, subSec = 0;
        let count = 0;

        Object.keys(this.selectedParts).forEach(catKey => {
            const cat = this.componentsData[catKey];
            const sel = this.selectedParts[catKey];
            const item = cat.items.find(i => i.id === sel.id);

            if (item && (item.hargaNew > 0 || item.hargaSecond > 0)) {
                count++;
                const isSec = sel.condition === "second";
                const price = isSec ? item.hargaSecond : item.hargaNew;
                if (isSec) subSec += price;
                else subNew += price;

                text += `${count}. ${cat.categoryName}: ${item.nama} (${isSec ? 'SECOND' : 'BARU'}) - Rp ${price.toLocaleString('id-ID')}\n`;
            }
        });

        text += `\nSubtotal Baru: Rp ${subNew.toLocaleString('id-ID')}`;
        text += `\nSubtotal Second: Rp ${subSec.toLocaleString('id-ID')}`;
        text += `\nTotal Estimasi: Rp ${(subNew + subSec).toLocaleString('id-ID')}\n`;
        text += `Website: https://kemalcomputer.com\n`;

        navigator.clipboard.writeText(text).then(() => {
            if (window.showSweetAlert) window.showSweetAlert("Rincian spesifikasi berhasil disalin ke clipboard!", "success");
            else alert("Rincian spesifikasi berhasil disalin!");
        }).catch(err => {
            console.error("Gagal menyalin:", err);
        });
    }

    printQuotation() {
        window.print();
    }
}

// Helpers
function itemHasNew(item) {
    if (!item) return false;
    if (item.onlySecond) return false;
    return item.hargaNew > 0;
}

function itemHasSecond(item) {
    if (!item) return false;
    if (item.onlyNew) return false;
    return item.hargaSecond > 0;
}

// Singleton Export
export const pcBuilder = new PCBuilderController();
window.pcBuilder = pcBuilder;
