(function () {
    'use strict';

    const PixelGridDrawer = {
        canvas: null,
        cellW: 0,
        cellH: 0,
        cols: 100,
        rows: 100,
        origin: { col: 0, row: 0 },
        ws: null,

        init(cols = 100, rows = 100) {
            this.canvas = document.querySelector("canvas.maplibregl-canvas");
            if (!this.canvas) {
                console.log("❌ Không tìm thấy canvas.maplibregl-canvas");
                return;
            }
            this.cols = cols;
            this.rows = rows;
            this.cellW = this.canvas.width / cols;
            this.cellH = this.canvas.height / rows;
            console.log(`✅ Init ${cols}x${rows}, cellW=${this.cellW}, cellH=${this.cellH}`);
        },

        pickOrigin() {
            if (!this.canvas) return;
            console.log("🖱 Click trên canvas để chọn vị trí vẽ");

            const handler = (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const px = (e.clientX - rect.left) * scaleX;
                const py = (e.clientY - rect.top) * scaleY;
                const col = Math.floor(px / this.cellW);
                const row = Math.floor(py / this.cellH);

                this.origin = { col, row };
                console.log(`🎯 Origin: col=${col}, row=${row}`);

                this.sendPixel(col, row);
                this.canvas.removeEventListener("click", handler);
            };

            this.canvas.addEventListener("click", handler);
        },

        drawPixel(col, row) {
            if (!this.canvas) return;
            const x = col * this.cellW + this.cellW / 2;
            const y = row * this.cellH + this.cellH / 2;
            ["mousedown", "mouseup", "click"].forEach(type => {
                this.canvas.dispatchEvent(new MouseEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y,
                    buttons: 1
                }));
            });
        },

        connectServer(url = "ws://localhost:8765") {
            if (this.ws) try { this.ws.close(); } catch {}
            this.ws = new WebSocket(url);

            this.ws.onopen = () => console.log("✅ WebSocket connected");
            this.ws.onclose = () => console.log("⚠️ WebSocket closed");
            this.ws.onerror = (e) => console.error("❌ WebSocket error:", e);

            this.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.action === "draw" && msg.pixels) {
                    console.log("📥 Received pixels:", msg.pixels);
                    msg.pixels.forEach(p => this.drawPixel(p.x, p.y));
                } else {
                    console.log("📥 Received:", msg);
                }
            };
        },

        sendPixel(col, row) {
            if (!this.ws || this.ws.readyState !== 1) {
                console.log("⚠️ Chưa kết nối server");
                return;
            }
            const payload = { action: "pixel", col, row };
            this.ws.send(JSON.stringify(payload));
            console.log("📤 Sent:", payload);
        }
    };

    window.PixelGridDrawer = PixelGridDrawer;
    console.log("✅ PixelGridDrawer ready!");
    console.log("• PixelGridDrawer.init(cols, rows)");
    console.log("• PixelGridDrawer.connectServer('ws://localhost:8765')");
    console.log("• PixelGridDrawer.pickOrigin()");

// === Chạy PixelGridDrawer khi nhấn phím P ===
window.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") {
        if (!window.PixelGridDrawer) {
            console.error("❌ PixelGridDrawer chưa sẵn sàng!");
            return;
        }
        PixelGridDrawer.init(94, 97);
        PixelGridDrawer.connectServer("ws://localhost:8765");
        PixelGridDrawer.pickOrigin();
        console.log("🚀 PixelGridDrawer started via key P!");
    }
});

})();
