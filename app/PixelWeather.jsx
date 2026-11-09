import React, { useEffect, useRef, useState } from 'react';
import './pixel-weather.css';

const DAYS = ['今天', '明天', '后天', '大后天'];
const DAY_FIELDS = 'weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max';
const CACHE_KEY = 'between-states.weather';
const CACHE_TTL = 30 * 60 * 1000;

async function getJson(url, signal) {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error('Weather service unavailable');
  return response.json();
}

async function locate(useDevice, signal) {
  if (useDevice) {
    const { coords } = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 600000 });
    });
    return { latitude: coords.latitude.toFixed(1), longitude: coords.longitude.toFixed(1), city: '' };
  }

  try {
    const data = await getJson('https://ipwho.is/?lang=zh-CN&fields=success,city,latitude,longitude', signal);
    const location = data?.success === true && ipLocation(data);
    if (location) return location;
  } catch (error) {
    if (signal.aborted) throw error;
  }
  const location = ipLocation(await getJson('https://get.geojs.io/v1/ip/geo.json', signal));
  if (!location) throw new Error('Location unavailable');
  return location;
}

function ipLocation(data) {
  const coordinate = (value, limit) => ['string', 'number'].includes(typeof value) && String(value).trim()
    && Math.abs(Number(value)) <= limit;
  if (!coordinate(data?.latitude, 90) || !coordinate(data.longitude, 180)) return null;
  const city = typeof data.city === 'string' ? data.city.trim() : '';
  return { latitude: Number(data.latitude), longitude: Number(data.longitude), city };
}

function conditionName(code) {
  if (code === 0) return '晴';
  if (code === 1 || code === 2) return '多云';
  if (code === 3) return '阴';
  if (code === 45 || code === 48) return '雾';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '雪';
  if ([95, 96, 99].includes(code)) return '雷雨';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '雨';
  return '天气未知';
}

function validForecast(forecast) {
  return Array.isArray(forecast?.daily?.time) && forecast.daily.time.length === DAYS.length
    && forecast.daily.time.every(date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))
    && Array.isArray(forecast.hourly?.time) && Number.isFinite(forecast.current?.temperature_2m);
}

function readCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
    if (typeof cached?.city === 'string' && validForecast(cached.forecast)) return cached;
  } catch {
    // Browsers can disable storage.
  }
  return null;
}

function PixelSky({ condition, night }) {
  const clear = condition === '晴';
  const partly = condition === '多云';
  const snow = condition === '雪';
  const storm = condition === '雷雨';
  const wet = condition === '雨' || storm || snow;
  const fog = condition === '雾';

  return (
    <svg className="pixel-weather__sky" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {(clear || partly) && (
        <g className="pixel-weather__light" transform={partly ? 'translate(0 1) scale(.72)' : undefined}>
          {night ? (
            <path className="pixel-weather__moon" d="M10 4h4v3h-3v6h2v2h6v3h-3v2H9v-2H6v-3H4V9h2V6h4zm8 2h2v2h-2z" />
          ) : (
            <>
              <path d="M8 7h8v2h2v6h-2v2H8v-2H6V9h2z" />
              <path className="pixel-weather__rays" d="M11 2h2v3h-2zm0 17h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4 4h2v2H4zm14 0h2v2h-2zM4 18h2v2H4zm14 0h2v2h-2z" />
            </>
          )}
        </g>
      )}
      {!clear && !fog && condition !== '天气未知' && (
        <path className="pixel-weather__cloud" transform={partly ? 'translate(1 3)' : undefined}
          d="M8 6h8v2h3v3h3v4h-2v2H4v-2H2v-4h2V8h4z" />
      )}
      {wet && (
        <path className="pixel-weather__fall" d={snow ? 'M5 19h2v2H5zm6 1h2v2h-2zm6-1h2v2h-2z' : 'M5 18h2v3H5zm6 1h2v3h-2zm6-1h2v3h-2z'} />
      )}
      {storm && <path className="pixel-weather__bolt" d="M12 11h5l-4 5h3l-6 7 2-6H9z" />}
      {fog && <path className="pixel-weather__cloud" d="M5 7h13v2H5zm-2 4h17v2H3zm4 4h14v2H7z" />}
      {condition === '天气未知' && <path className="pixel-weather__cloud" d="M5 11h2v2H5zm6 0h2v2h-2zm6 0h2v2h-2z" />}
    </svg>
  );
}

function HourlyBars({ hourly, date }) {
  const hours = hourly?.time?.flatMap((time, index) => (
    typeof time === 'string' && time.startsWith(date + 'T')
      ? [{ temperature: hourly.temperature_2m?.[index], rain: hourly.precipitation_probability?.[index] }]
      : []
  )) ?? [];
  const temperatures = hours.map(hour => hour.temperature).filter(Number.isFinite);
  if (hours.length < 2 || !temperatures.length) return <p className="pixel-weather__status">逐小时预报暂缺</p>;

  const low = Math.floor(Math.min(...temperatures));
  const high = Math.max(low + 2, Math.ceil(Math.max(...temperatures)));
  return (
    <div className="pixel-weather__graph" role="img"
      aria-label={`逐小时气温 ${Math.min(...temperatures)} 到 ${Math.max(...temperatures)} 摄氏度。下排是各小时的降水概率。`}>
      <div className="pixel-weather__scale" aria-hidden="true"><span>{high}°</span><span>{low}°</span></div>
      <div className="pixel-weather__bars" aria-hidden="true">
        {hours.map(({ temperature }, index) => {
          const level = Number.isFinite(temperature) ? (1 + Math.round(7 * (temperature - low) / (high - low))) / 8 : 0;
          return <span key={index} className="pixel-weather__bar" style={{ '--level': level }} />;
        })}
      </div>
      <span aria-hidden="true">降水</span>
      <div className="pixel-weather__bars pixel-weather__bars--rain" aria-hidden="true">
        {hours.map(({ rain }, index) => (
          <span key={index} className="pixel-weather__bar" style={{ '--level': Number.isFinite(rain) ? Math.ceil(rain / 25) / 4 : 0 }} />
        ))}
      </div>
      <div className="pixel-weather__hours" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>23 时</span></div>
    </div>
  );
}

const degrees = value => Number.isFinite(value) ? `${Math.round(value)}°` : '—';

export default function PixelWeather({ active }) {
  const [day, setDay] = useState(0);
  const [lookup, setLookup] = useState({ useDevice: false, skipCache: false });
  const [result, setResult] = useState(null);
  const latest = useRef(null);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const { signal } = controller;
    let location;
    let loading = false;
    async function load() {
      if (document.hidden || loading) return;
      const cached = latest.current ?? (!lookup.useDevice && !lookup.skipCache ? readCache() : null);
      const age = Date.now() - cached?.at;
      if (age >= 0 && age < CACHE_TTL) {
        latest.current = cached;
        setResult(cached);
        return;
      }
      loading = true;
      try {
        // Keep an approved device location in memory only.
        if (!lookup.useDevice || !location) location = await locate(lookup.useDevice, signal);
        if (signal.aborted) return;
        const query = new URLSearchParams({
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: 'auto',
          forecast_days: '4',
          current: 'temperature_2m,weather_code,is_day',
          hourly: 'temperature_2m,precipitation_probability',
          daily: DAY_FIELDS,
        });
        const forecast = await getJson(`https://api.open-meteo.com/v1/forecast?${query}`, signal);
        if (!validForecast(forecast)) throw new Error('Forecast unavailable');
        if (signal.aborted) return;
        const fresh = { forecast: { current: forecast.current, daily: forecast.daily, hourly: forecast.hourly },
          city: location.city, at: Date.now() };
        latest.current = fresh;
        setResult(fresh);
        if (!lookup.useDevice) {
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); } catch { /* Storage is optional. */ }
        }
      } catch {
        if (!signal.aborted) setResult({ error: location ? '预报暂时取不到' : '暂时无法判断你的地区', located: Boolean(location), city: location?.city });
      } finally {
        loading = false;
      }
    }
    load();
    const timer = setInterval(load, 60_000);
    document.addEventListener('visibilitychange', load);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [active, lookup]);

  function retry(useDevice) {
    latest.current = null;
    setResult(null);
    setLookup({ useDevice, skipCache: true });
  }

  const { forecast, city, located, error } = result ?? {};
  const { current, daily, hourly } = forecast ?? {};
  const condition = conditionName(current?.weather_code);
  const probability = daily?.precipitation_probability_max?.[day];

  return (
    <aside className="pixel-weather" aria-label="本地天气" data-active={active}>
      <details onKeyDown={event => {
        if (event.key !== 'Escape' || !event.currentTarget.open) return;
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary').focus();
      }}>
        <summary className="pixel-weather__trigger">
          <span className="pixel-weather__city" title={city || undefined}>{city || '本地天气'}</span>
          <span className="pixel-weather__now" aria-live="polite">
            {current ? (
              <>
                <strong>{degrees(current.temperature_2m)}</strong>
                <span className="pixel-weather__sr">{condition}</span>
                <PixelSky key={`${condition}-${current.is_day}`} condition={condition} night={current.is_day === 0} />
              </>
            ) : <span>{error ? '暂不可用' : '读取中…'}</span>}
          </span>
        </summary>
        <div className="pixel-weather__panel">
          {daily ? (
            <>
              <div className="pixel-weather__days" role="group" aria-label="预报日期">
                {daily.time.map((date, index) => (
                  <button type="button" key={date} aria-pressed={day === index}
                    aria-label={`${DAYS[index]} ${date}，最低 ${degrees(daily.temperature_2m_min?.[index])}，最高 ${degrees(daily.temperature_2m_max?.[index])}`}
                    onClick={() => setDay(index)}>
                    <span>{DAYS[index]}</span>
                    <span>{degrees(daily.temperature_2m_min?.[index])} / {degrees(daily.temperature_2m_max?.[index])}</span>
                  </button>
                ))}
              </div>
              <div className="pixel-weather__summary" aria-live="polite">
                <span>{conditionName(daily.weather_code?.[day])}</span>
                <span>{Number.isFinite(probability) ? `最高降水概率 ${probability}%` : '降水概率 —'}</span>
              </div>
              <HourlyBars hourly={hourly} date={daily.time[day]} />
              <div className="pixel-weather__foot">
                <span>{lookup.useDevice ? '设备定位' : 'IP 估算'}</span>
                <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo ↗</a>
              </div>
            </>
          ) : (
            <>
              <p className="pixel-weather__status" role="status">{error ?? '正在读取当地预报…'}</p>
              {error && (
                <div className="pixel-weather__retry">
                  <button type="button" onClick={() => retry(lookup.useDevice)}>重试</button>
                  {!located && !lookup.useDevice && navigator.geolocation
                    && <button type="button" onClick={() => retry(true)}>使用设备定位</button>}
                </div>
              )}
            </>
          )}
        </div>
      </details>
    </aside>
  );
}
