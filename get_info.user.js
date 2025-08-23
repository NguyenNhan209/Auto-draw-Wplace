// ==UserScript==
// @name         Wplace User Info Overlay + Paint Counter (Draggable + Collapse)
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Hiển thị thông tin user + số lần vẽ hiện tại, có thể kéo thả và thu nhỏ
// @match        *://wplace.live/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ===== Overlay cơ bản =====
    class Overlay {
        constructor() {
            this.container = document.createElement("div");
            this.container.id = "user-overlay";
            Object.assign(this.container.style, {
                position: "fixed",
                top: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "10px",
                fontFamily: "monospace",
                fontSize: "14px",
                zIndex: 99999,
                maxWidth: "250px",
                lineHeight: "1.5em",
                cursor: "move",
                userSelect: "none"
            });

            // Thanh header để kéo + nút thu nhỏ
            this.header = document.createElement("div");
            this.header.style.display = "flex";
            this.header.style.justifyContent = "space-between";
            this.header.style.alignItems = "center";
            this.header.style.marginBottom = "5px";

            this.title = document.createElement("div");
            this.title.innerText = "User Info";

            this.toggleBtn = document.createElement("button");
            this.toggleBtn.innerText = "−";
            Object.assign(this.toggleBtn.style, {
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "16px",
                cursor: "pointer"
            });

            this.header.appendChild(this.title);
            this.header.appendChild(this.toggleBtn);
            this.container.appendChild(this.header);

            // Vùng hiển thị dữ liệu
            this.content = document.createElement("div");
            this.container.appendChild(this.content);

            document.body.appendChild(this.container);

            this.data = {};
            this.collapsed = false;

            this.makeDraggable();
            this.toggleBtn.addEventListener("click", () => this.toggle());
        }

        updateData(newData) {
            Object.assign(this.data, newData);
            this.render();
        }

        render() {
            if (this.collapsed) return;
            const d = this.data;
            this.content.innerHTML = `
                <div><b>Name:</b> ${d.name || "-"}</div>
                <div><b>ID:</b> ${d.id || "-"}</div>
                <div><b>Level:</b> ${d.level ? Math.floor(d.level) : "-"}</div>
                <div><b>Droplets:</b> ${d.droplets ?? "-"}</div>
                <div><b>Pixels painted:</b> ${d.pixelsPainted ?? "-"}</div>
                <div><b>Pixels to next:</b> ${d.needPixels ?? "-"}</div>
                <div><b>Current paints:</b> ${d.currentPaints ?? "-"}</div>
            `;
        }

        toggle() {
            this.collapsed = !this.collapsed;
            this.content.style.display = this.collapsed ? "none" : "block";
            this.toggleBtn.innerText = this.collapsed ? "+" : "−";
        }

        makeDraggable() {
            let isDragging = false, offsetX, offsetY;

            this.header.addEventListener("mousedown", (e) => {
                isDragging = true;
                offsetX = e.clientX - this.container.offsetLeft;
                offsetY = e.clientY - this.container.offsetTop;
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            });

            const onMouseMove = (e) => {
                if (!isDragging) return;
                this.container.style.left = e.clientX - offsetX + "px";
                this.container.style.top = e.clientY - offsetY + "px";
                this.container.style.right = "auto"; // bỏ fixed right để kéo tự do
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };
        }
    }

    const overlay = new Overlay();

    // ===== API lấy thông tin user =====
    async function getUserInfo() {
        try {
            const res = await fetch("https://backend.wplace.live/me", {
                credentials: "include"
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            return await res.json();
        } catch (err) {
            console.error("Fetch user info failed:", err);
            return null;
        }
    }

    // ===== Tính số pixel cần để lên level =====
    function pixelsToNextLevel(level, painted) {
        const currentLevelInt = Math.floor(level);
        const threshold = Math.pow(
            currentLevelInt * Math.pow(30, 0.65),
            1 / 0.65
        );
        return Math.max(0, Math.ceil(threshold - painted));
    }

    // ===== Cập nhật =====
    async function refresh() {
        const user = await getUserInfo();
        if (!user) {
            overlay.updateData({ name: "Error loading user" });
            return;
        }
        overlay.updateData({
            name: user.name,
            id: user.id,
            droplets: user.droplets,
            level: user.level,
            pixelsPainted: user.pixelsPainted,
            needPixels: pixelsToNextLevel(user.level, user.pixelsPainted),
        });
    }

    refresh();
    setInterval(refresh, 5000); // auto refresh mỗi 5s

    // ===== Hook fillText để lấy số paint hiện tại =====
    (function () {
        const oldFillText = CanvasRenderingContext2D.prototype.fillText;

        CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
            if (typeof text === "string" && /\d+\/\d+/.test(text)) {
                const current = text.split("/")[0];
                overlay.updateData({ currentPaints: current });
            }
            return oldFillText.apply(this, [text, x, y, ...args]);
        };
    })();

})();
