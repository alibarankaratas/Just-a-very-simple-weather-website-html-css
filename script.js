const todayDateEl = document.getElementById("todayDate");
const yearNowEl   = document.getElementById("yearNow");
const now = new Date();

todayDateEl.textContent = now.toLocaleDateString("tr-TR", {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric"
});
yearNowEl.textContent = now.getFullYear();

const themeButtons = document.querySelectorAll(".theme-btn");
const savedTheme = localStorage.getItem("weather_theme") || "gray";

function setTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("weather_theme", theme);
  themeButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

setTheme(savedTheme);

themeButtons.forEach(btn => {
  btn.addEventListener("click", () => setTheme(btn.dataset.theme));
});

const API_KEY = "YOUR_API_KEY_HERE";   // ← OpenWeatherMap API anahtarınızı buraya yapıştırın

const form         = document.getElementById("searchForm");
const cityInput    = document.getElementById("cityInput");
const searchBtn    = document.getElementById("searchBtn");
const statusText   = document.getElementById("statusText");
const errorMessage = document.getElementById("errorMessage");

const cityName     = document.getElementById("cityName");
const condition    = document.getElementById("conditionText");
const tempNow      = document.getElementById("tempNow");
const feelsLike    = document.getElementById("feelsLike");
const humidity     = document.getElementById("humidity");
const wind         = document.getElementById("wind");
const visibility   = document.getElementById("visibility");
const uv           = document.getElementById("uv");
const forecastRow  = document.getElementById("forecastRow");

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.style.color = "var(--error)";
}

function clearError() {
  errorMessage.textContent = "";
}

function setLoading(isLoading) {
  document.body.classList.toggle("loading", isLoading);
  searchBtn.disabled = isLoading;
  statusText.textContent = isLoading ? "Yükleniyor..." : "Hazir";
}

async function getWeather(city) {
  clearError();
  setLoading(true);

  try {
    // 1. Geocoding – only allow Turkey
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)},TR&limit=1&appid=${API_KEY}`
    );
    if (!geoRes.ok) throw new Error("Şehir bulunamadi");

    const geo = await geoRes.json();
    if (geo.length === 0) {
      showError("Bu şehir Türkiye’de bulunamadi.");
      return;
    }

    const { lat, lon, name, country } = geo[0];
    if (country !== "TR") {
      showError("Bu uygulama sadece Türkiye şehirleri için çalışmaktadır.");
      return;
    }

    // 2. Current weather
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=tr&appid=${API_KEY}`
    );
    if (!weatherRes.ok) throw new Error("Hava durumu alınamadı");
    const current = await weatherRes.json();

    // 3. Forecast (5 day / 3 hour)
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=tr&appid=${API_KEY}`
    );
    if (!forecastRes.ok) throw new Error("Tahmin alınamadı");
    const forecastData = await forecastRes.json();

    // ── Fill current weather ─────────────────────────────
    cityName.textContent    = name;
    condition.textContent   = current.weather[0].description;
    tempNow.textContent     = Math.round(current.main.temp) + "°";
    feelsLike.textContent   = Math.round(current.main.feels_like);
    humidity.textContent    = current.main.humidity + "%";
    wind.textContent        = Math.round(current.wind.speed) + " km/s";
    visibility.textContent  = (current.visibility / 1000).toFixed(0) + " km";
    uv.textContent          = "—"; // Free tier doesn't include UV

    // ── Simple daily forecast (group by day) ─────────────
    forecastRow.innerHTML = "";

    const daily = {};
    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toLocaleDateString("tr-TR", { weekday: "short" });

      if (!daily[dayKey]) {
        daily[dayKey] = {
          min: item.main.temp_min,
          max: item.main.temp_max,
          icon: item.weather[0].icon
        };
      } else {
        daily[dayKey].min = Math.min(daily[dayKey].min, item.main.temp_min);
        daily[dayKey].max = Math.max(daily[dayKey].max, item.main.temp_max);
      }
    });

    Object.entries(daily).slice(0, 5).forEach(([day, data]) => {
      const div = document.createElement("div");
      div.className = "forecast-item";
      div.innerHTML = `
        <span class="f-day">${day}</span>
        <img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="Hava durumu ikonu">
        <span class="f-temp">${Math.round(data.min)}° – ${Math.round(data.max)}°</span>
      `;
      forecastRow.appendChild(div);
    });

    statusText.textContent = "Güncel veri gösteriliyor";
  } catch (err) {
    showError(err.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  getWeather(city);
  cityInput.blur();
});