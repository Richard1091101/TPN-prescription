# 臨床 TPN 處方調整與分析系統 (Clinical TPN Prescription Studio)

專業級臨床全靜脈營養 (TPN) 處方計算、配方調整、熱量電解質差距分析與醫囑開立系統。內建 ASPEN / ESPEN 指引、GIR 監測、周邊/中央靜脈滲透壓安全檢查、2018.10.08 調劑物理體積推演、鈣磷沉澱與脂肪破乳禁忌檢核，並支援 Microsoft Excel 相容之 CSV 藥品資料庫匯入/匯出。

---

## 🚀 執行模式說明 (Execution Modes)

本專案提供兩種執行方式，適應不同臨床與部署環境：

### 模式 A：純 HTML 單一檔案獨立執行 (無需 Node.js / 無需伺服器)
- **檔案路徑**：專案根目錄下的 `tpn_app.html` 或 `public/tpn_app.html`
- **使用方式**：
  1. 直接使用任一現代瀏覽器（Google Chrome, Microsoft Edge, Safari, Firefox）**雙擊開啟** `tpn_app.html`。
  2. 可隨身存放於隨身碟、醫院內網封閉電腦、平板電腦或手機中，**100% 離線執行**。
  3. 資料庫自動儲存於瀏覽器 LocalStorage，重新開啟處方與自訂資料依然保留。

### 模式 B：Git / GitHub Pages 靜態網站自動部署 (Web Hosting)
本專案已配置 GitHub Actions 自動化工作流程（`.github/workflows/deploy.yml`）與相對路徑支援 (`base: './'`)。

#### 部署至 GitHub Pages 步驟：
1. **將專案推送至您的 GitHub Repository**：
   ```bash
   git init
   git add .
   git commit -m "feat: initial clinical TPN studio with HTML execution support"
   git branch -M main
   git remote add origin https://github.com/<您的使用者名稱>/<專案名稱>.git
   git push -u origin main
   ```

2. **啟用 GitHub Pages 設定**：
   - 前往 GitHub 儲存庫頁面，點擊 **Settings** -> **Pages**。
   - 在 **Build and deployment** 下方的 **Source** 選擇 **GitHub Actions**。
   - 每次您推送 (`git push`) 程式碼至 `main` 或 `master` 分支時，GitHub Actions 會自動執行 `npm run build` 並部署至：
     `https://<您的使用者名稱>.github.io/<專案名稱>/`
   - 同時亦可直接訪問純 HTML 版本：
     `https://<您的使用者名稱>.github.io/<專案名稱>/tpn_app.html`

---

## 💻 本地端開發與建置 (Developer Setup)

若需在本地端進行開發或擴充：

```bash
# 1. 安裝依賴套件
npm install

# 2. 啟動本機開發伺服器 (Port 3000)
npm run dev

# 3. 執行 TypeScript 與語法檢查
npm run lint

# 4. 建置靜態發布檔案 (輸出至 dist/ 目錄)
npm run build
```

建置完成後，`dist/` 資料夾即為完整可部署的靜態 HTML/CSS/JS 網站。

---

## 📋 臨床功能特色

1. **病患基礎需求與微調**：Mifflin-St Jeor 公式、AF、SF、IBW、AdjBW、BMR、TEE 計算，支援自訂目標連動。
2. **雙軌配方對比與微調**：目前處方 vs 新處方並排對照，支援每 1000ml 主配方自訂、流速步進器（`[-5]/[+5]`）。
3. **三維差距分析**：熱量、巨量營養素與 6 大關鍵電解質（Na, K, P, Ca, Mg, Zn）之目前值、調整值、目標差距與達成率即時對比。
4. **2018.10.08 調劑物理體積推演**：G/W 50%、Moriamin-SN 10%、Aminopoly-H 7.15%、Nephrosteril 7%、Aminosteril 10%、高濃度電解質原料精確毫升數推算與無菌水剩餘空間檢核。
5. **禁忌警示 (不可進食使用)**：
   - 鈣磷沉澱結晶檢核（$[Ca] + [P] > 45$ 或 $Ca \times P > 300$）。
   - 三合一脂肪乳劑破乳檢核（二價陽離子 $[Ca^{2+}] + [Mg^{2+}] > 20\text{ mEq/L}$）。
   - 周邊靜脈高滲透壓（$> 900\text{ mOsm/L}$）或高鉀（$> 40\text{ mEq/L}$）靜脈炎壞死警示。
   - 葡萄糖輸注率（GIR $> 5.0\text{ mg/kg/min}$）高血糖風險。
6. **生化校正計算工具**：白蛋白校正鈣、鈉缺乏量 (Na Deficit)、輸注後預期血鈉上升量 (Delta Na)。
7. **標準 HIS 醫囑輸出**：一鍵複製格式化文字與遞增滴定排程。
8. **藥品資料庫 CSV 匯入/匯出**：UTF-8 BOM (`\uFEFF`) 編碼，支援 Microsoft Excel 直接編輯。
