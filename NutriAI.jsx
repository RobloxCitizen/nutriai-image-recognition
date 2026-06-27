const { useState, useRef } = React;

// ─── Design tokens ──────────────────────────────────────────────────────────
const DARK  = "#0D3B2E";
const SAGE  = "#52796F";
const LIME  = "#B5D43C";
const CREAM = "#F8FAF7";

const card = {
  background: "#fff",
  borderRadius: 18,
  border: "1px solid #E4EDE4",
  padding: "18px 20px",
  marginBottom: 12,
};

// ─── MacroBar ───────────────────────────────────────────────────────────────
function MacroBar({ label, value, max, accent }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: SAGE, fontWeight: 600 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontSize: 14, color: DARK, fontWeight: 700 }}>{value}g</span>
          <span style={{ fontSize: 11, color: "#AAB5AA" }}>{pct}% DV</span>
        </div>
      </div>
      <div style={{ height: 6, background: "#E4EDE4", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: accent,
          borderRadius: 3,
          transition: "width 1.1s cubic-bezier(.4,0,.2,1)"
        }} />
      </div>
    </div>
  );
}

// ─── ScoreRing ──────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const filled = (score / 10) * circ;
  const color = score >= 7 ? LIME : score >= 5 ? "#F5A623" : "#FF6B6B";
  const label = score >= 7 ? "Excellent" : score >= 5 ? "Average" : "Poor";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 92, height: 92 }}>
        <svg viewBox="0 0 90 90" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="45" cy="45" r={r} fill="none" stroke="#D8E8D8" strokeWidth="7" />
          <circle
            cx="45" cy="45" r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center"
        }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: DARK, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 9, color: "#AABFAA", marginTop: 1 }}>/ 10</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, marginTop: 5, letterSpacing: "0.3px" }}>{label}</span>
    </div>
  );
}

// ─── Image compression → Base64 ─────────────────────────────────────────────
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX = 900;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
        else                 { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const dataURL = canvas.toDataURL("image/jpeg", 0.78);
      resolve({ base64: dataURL.split(",")[1], mimeType: "image/jpeg", previewURL: dataURL });
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
}

// ─── Constants ──────────────────────────────────────────────────────────────
const WORKER_URL = "https://nutriai-worker-image-recognition.wtbbiealtm18.workers.dev/";

const EXAMPLES = [
  { icon: "🍳", label: "Eggs & toast",      meal: "Two fried eggs with buttered whole wheat toast and a glass of orange juice" },
  { icon: "🍝", label: "Pasta bolognese",   meal: "Large plate of pasta bolognese with grated parmesan and glass of red wine" },
  { icon: "🥗", label: "Caesar salad",      meal: "Large Caesar salad with grilled chicken breast, croutons and Caesar dressing" },
  { icon: "🫐", label: "Acai bowl",         meal: "Acai bowl with granola, banana, blueberries, honey and almond butter" },
];

const STEPS_PHOTO = [
  { n: "1", text: "Upload a photo or use your camera" },
  { n: "2", text: "AI identifies food & estimates portions" },
  { n: "3", text: "Get calories, macros & health tips" },
];
const STEPS_TEXT = [
  { n: "1", text: "Describe your meal in natural language" },
  { n: "2", text: "AI analyzes nutritional content instantly" },
  { n: "3", text: "Get calories, macros & health tips" },
];

// ─── NutriAI ────────────────────────────────────────────────────────────────
function NutriAI() {
  const [mode,               setMode]               = useState("photo");
  const [meal,               setMeal]               = useState("");
  const [imagePreview,       setImagePreview]       = useState(null);
  const [imageBase64,        setImageBase64]        = useState(null);
  const [imageMimeType,      setImageMimeType]      = useState(null);
  const [textHint,           setTextHint]           = useState("");
  const [dragging,           setDragging]           = useState(false);
  const [loading,            setLoading]            = useState(false);
  const [result,             setResult]             = useState(null);
  const [resultMode,         setResultMode]         = useState(null);
  const [resultImagePreview, setResultImagePreview] = useState(null);
  const [resultMeal,         setResultMeal]         = useState("");
  const [error,              setError]              = useState(null);

  const galleryRef = useRef(null);
  const cameraRef  = useRef(null);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = async (file, inputEl) => {
    if (inputEl) inputEl.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const { base64, mimeType, previewURL } = await compressImage(file);
      setImagePreview(previewURL);
      setImageBase64(base64);
      setImageMimeType(mimeType);
      setError(null);
    } catch {
      setError("Failed to load image. Please try another file.");
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setTextHint("");
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current)  cameraRef.current.value  = "";
  };

  // ── Analyze ────────────────────────────────────────────────────────────────
  const analyze = async (textOverride) => {
    const currentMode = mode;
    const mealText    = textOverride !== undefined ? textOverride : meal;

    if (currentMode === "photo" && !imageBase64) return;
    if (currentMode === "text"  && !mealText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body = currentMode === "photo"
        ? { imageBase64, mimeType: imageMimeType, textHint: textHint.trim() }
        : { meal: mealText };

      const resp = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      const raw  = (data.content || []).map(i => i.text || "").join("");
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Bad response");

      const parsed = JSON.parse(match[0]);
      setResult(parsed);
      setResultMode(currentMode);
      setResultImagePreview(currentMode === "photo" ? imagePreview : null);
      setResultMeal(mealText);
    } catch {
      setError("Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  const reset = () => {
    setResult(null);
    setResultMode(null);
    setResultImagePreview(null);
    setResultMeal("");
    clearImage();
    setMeal("");
    setError(null);
  };

  // ── Logo ───────────────────────────────────────────────────────────────────
  const Logo = () => (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: LIME, fontWeight: 900, fontSize: 17, letterSpacing: "-0.3px" }}>NutriAI</span>
      <span style={{ background: LIME, color: DARK, fontSize: 8, fontWeight: 900, padding: "2px 6px", borderRadius: 4, letterSpacing: "1px" }}>BETA</span>
    </div>
  );

  const isDisabled = loading || (mode === "photo" ? !imageBase64 : !meal.trim());

  // ══════════════════════════════════════════════════════════════════════════
  // Result view
  // ══════════════════════════════════════════════════════════════════════════
  if (result) {
    return (
      <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {/* Header */}
        <div style={{ background: DARK, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo />
          <button
            onClick={reset}
            style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600,
              padding: "6px 12px", borderRadius: 8, cursor: "pointer"
            }}
          >
            ← New analysis
          </button>
        </div>

        <div style={{ maxWidth: 540, margin: "0 auto", padding: "16px 16px 48px" }}>

          {/* Analyzed meal card */}
          <div style={{ ...card, padding: "12px 16px", background: "#F0F5F0" }}>
            <div style={{ fontSize: 10, color: SAGE, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
              Analyzed meal
            </div>
            {resultMode === "photo" && resultImagePreview ? (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <img
                  src={resultImagePreview}
                  alt="Analyzed food"
                  style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{result.meal_name || "Photo analysis"}</div>
                  {result.portion_estimate && (
                    <div style={{ fontSize: 12, color: SAGE, marginTop: 3 }}>📏 {result.portion_estimate}</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{resultMeal}</div>
            )}
          </div>

          {/* Calories + ScoreRing */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: SAGE, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
                  {result.meal_type}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 54, fontWeight: 900, color: DARK, lineHeight: 1 }}>{result.calories}</span>
                  <span style={{ fontSize: 14, color: "#BCC8BC", marginLeft: 2 }}>kcal</span>
                </div>
              </div>
              <ScoreRing score={result.health_score} />
            </div>
            <MacroBar label="Protein"        value={result.protein_g} max={50}  accent="#5B9BD5" />
            <MacroBar label="Carbohydrates"  value={result.carbs_g}   max={130} accent="#F5A623" />
            <MacroBar label="Fat"            value={result.fat_g}     max={65}  accent="#E07070" />
            <MacroBar label="Fiber"          value={result.fiber_g}   max={25}  accent={LIME}    />
          </div>

          {/* Highlights */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 12, letterSpacing: "-0.2px" }}>Nutritional highlights</div>
            {result.highlights.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 9, alignItems: "flex-start" }}>
                <span style={{ color: LIME, fontWeight: 900, fontSize: 15, lineHeight: "20px", flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 13, color: "#555", lineHeight: 1.55 }}>{h}</span>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ background: DARK, borderRadius: 18, padding: "18px 20px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: LIME, marginBottom: 12 }}>How to improve this meal</div>
            {result.tips.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 9, alignItems: "flex-start" }}>
                <span style={{ color: LIME, fontWeight: 900, fontSize: 13, flexShrink: 0, lineHeight: "20px" }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.55 }}>{t}</span>
              </div>
            ))}
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "#C0CFBC", marginTop: 20 }}>
            Powered by Gemini AI · Free Cal AI alternative
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Main input view
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: DARK, padding: "32px 20px 52px", textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.09)",
          borderRadius: 100, padding: "6px 16px", marginBottom: 18
        }}>
          <Logo />
        </div>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: "0 0 10px", letterSpacing: "-1px", lineHeight: 1.15 }}>
          {mode === "photo" ? "Snap your meal 📸" : "What did you eat?"}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>
          Instant calories, macros & health score — powered by AI
        </p>
      </div>

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "0 16px 48px" }}>

        {/* Main card */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 10px 40px rgba(13,59,46,0.10)",
          marginTop: -28,
          marginBottom: 16,
          border: "1px solid #E4EDE4"
        }}>

          {/* Mode tabs */}
          <div style={{ display: "flex", background: "#F0F5F0", borderRadius: 12, padding: 4, marginBottom: 18 }}>
            {[["photo", "📷  Photo"], ["text", "✏️  Text"]].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: mode === m ? LIME : "transparent",
                  color: mode === m ? DARK : SAGE,
                  transition: "all 0.2s",
                  letterSpacing: "-0.1px",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Photo mode ─────────────────────────────────────────────── */}
          {mode === "photo" && (
            <>
              {imagePreview ? (
                /* Image preview */
                <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
                  <img
                    src={imagePreview}
                    alt="Food to analyze"
                    style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }}
                  />
                  <button
                    onClick={clearImage}
                    style={{
                      position: "absolute", top: 10, right: 10,
                      background: "rgba(0,0,0,0.55)", border: "none",
                      color: "#fff", borderRadius: "50%",
                      width: 30, height: 30, fontSize: 14,
                      cursor: "pointer", lineHeight: "30px",
                    }}
                  >✕</button>
                </div>
              ) : (
                /* Drop zone */
                <div
                  onDragOver={(e)  => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={()  => setDragging(false)}
                  onDrop={(e)      => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                  onClick={()      => galleryRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragging ? SAGE : "#C8DEC8"}`,
                    borderRadius: 14,
                    padding: "34px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragging ? "#EEF4EE" : CREAM,
                    transition: "all 0.2s",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 38, marginBottom: 10 }}>🥘</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 4 }}>
                    Drop a photo here or tap to browse
                  </div>
                  <div style={{ fontSize: 12, color: "#AABFAA" }}>JPG, PNG, HEIC — max 10 MB</div>
                </div>
              )}

              {/* Hidden inputs */}
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0], e.target)}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0], e.target)}
              />

              {/* Camera button — only when no image */}
              {!imagePreview && (
                <button
                  onClick={() => cameraRef.current?.click()}
                  style={{
                    width: "100%", padding: "11px 0",
                    background: DARK, color: "#fff",
                    border: "none", borderRadius: 10,
                    fontSize: 13, fontWeight: 700,
                    cursor: "pointer", marginBottom: 12,
                    letterSpacing: "-0.1px",
                  }}
                >
                  📷 Take photo with camera
                </button>
              )}

              {/* Optional text hint — only when image selected */}
              {imagePreview && (
                <input
                  type="text"
                  value={textHint}
                  onChange={(e) => setTextHint(e.target.value)}
                  placeholder='Optional note: e.g. "large portion" or "with extra dressing"'
                  style={{
                    width: "100%", padding: "11px 14px",
                    border: "1.5px solid #E4EDE4", borderRadius: 10,
                    fontSize: 13, color: DARK,
                    background: CREAM, boxSizing: "border-box",
                    fontFamily: "inherit", outline: "none",
                    marginBottom: 12,
                  }}
                />
              )}
            </>
          )}

          {/* ── Text mode ──────────────────────────────────────────────── */}
          {mode === "text" && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                Describe your meal
              </div>
              <textarea
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
                placeholder="e.g. Two scrambled eggs with whole wheat toast, a banana, and black coffee..."
                style={{
                  width: "100%", height: 90,
                  padding: "12px 14px",
                  border: `1.5px solid ${meal ? SAGE + "66" : "#E4EDE4"}`,
                  borderRadius: 12,
                  fontSize: 14, color: DARK,
                  resize: "none", boxSizing: "border-box",
                  fontFamily: "inherit", outline: "none",
                  background: CREAM, lineHeight: 1.6,
                  transition: "border-color 0.2s"
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyze(meal); }
                }}
              />
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setMeal(ex.meal); analyze(ex.meal); }}
                    style={{
                      fontSize: 11, fontWeight: 600,
                      padding: "5px 11px", borderRadius: 100,
                      border: "1.5px solid #D8E8D0",
                      background: "#F2F8F2", color: SAGE,
                      cursor: "pointer"
                    }}
                  >
                    {ex.icon} {ex.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Analyze button */}
          <button
            onClick={() => analyze()}
            disabled={isDisabled}
            style={{
              marginTop: 14, width: "100%",
              background: isDisabled ? "#E4EDE4" : LIME,
              color: isDisabled ? "#AABFAA" : DARK,
              border: "none", borderRadius: 12,
              padding: "14px 0", fontSize: 14,
              fontWeight: 800,
              cursor: isDisabled ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              letterSpacing: "-0.2px"
            }}
          >
            {loading
              ? "Analyzing..."
              : mode === "photo" ? "Analyze photo →" : "Analyze nutrition →"}
          </button>

          {error && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "#FFF0F0", borderRadius: 10, color: "#C0392B", fontSize: 12 }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🤖</div>
            <div style={{ fontSize: 14, color: SAGE, fontWeight: 600 }}>
              AI is analyzing your {mode === "photo" ? "photo" : "meal"}...
            </div>
            <div style={{ fontSize: 12, color: "#AABFAA", marginTop: 4 }}>
              Calculating calories, macros & health score
            </div>
          </div>
        )}

        {/* How it works */}
        {!loading && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#C0CFBC", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", marginBottom: 14 }}>
              How it works
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {(mode === "photo" ? STEPS_PHOTO : STEPS_TEXT).map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "14px 10px", textAlign: "center", border: "1px solid #E4EDE4" }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: DARK, color: LIME,
                    fontSize: 12, fontWeight: 900,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 8px"
                  }}>{s.n}</div>
                  <div style={{ fontSize: 11, color: "#667", lineHeight: 1.55 }}>{s.text}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#C0CFBC", marginTop: 24 }}>
          Powered by Gemini AI · Free Cal AI alternative
        </p>
      </div>
    </div>
  );
}
