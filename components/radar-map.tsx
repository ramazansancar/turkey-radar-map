'use client'

import { useState, useEffect, useRef, use } from 'react'
import {
  ExternalLink,
  MapPin,
  Loader2,
  Radar,
  AlertTriangle,
  MessageCircleWarning,
} from 'lucide-react'
import citiesData from '@/data/cities.json'

interface RadarMarker {
  name: string
  lat: number
  lng: number
  source: string
}

interface RadarData {
  markers: RadarMarker[]
  meta: {
    count: number
    cache_at: number
  }
  center: {
    lat: number
    lng: number
  }
  zoom: number
}

const mapTypes = [
  {
    value: 'osm',
    label: 'OSM',
    logo: '/osm.svg',
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribute:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  },
  {
    value: 'arcGIS',
    label: 'arcGIS',
    logo: '/ArcGIS.png',
    tileLayer:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribute:
      '&copy; <a href="https://www.esri.com/">Esri</a>, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS',
    maxZoom: 19,
  },
  {
    value: 'google',
    label: 'Google',
    logo: '/google.svg',
    tileLayer: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribute: '&copy; <a href="https://www.google.com/maps">Google Maps</a> contributors',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 19,
  },
]

const getTileLayer = (mapType: string) => {
  const type = mapTypes.find((type) => type.value === mapType)
  if (type) {
    return {
      url: type.tileLayer,
      attribution: type.attribute,
      subdomains: type.subdomains || [],
      maxZoom: type.maxZoom || 19,
    }
  }
  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  }
}

interface Location {
  lat: number
  lng: number
}
interface UserLocation extends Location {}

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export function RadarMap() {
  const mapRef = useRef<L.Map | null>(null)
  //const markerRef = useRef<L.Marker>(null)

  const [mapType, setMapType] = useState<'osm' | 'arcGIS' | 'google'>('osm')
  const [isLoaded, setIsLoaded] = useState(false)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [radarData, setRadarData] = useState<RadarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [zoomLevel, setZoomLevel] = useState<number>(7)
  const [centerCoordinates, setCenterCoordinates] = useState<UserLocation>({
    lat: 39.9334, // Türkiye'nin merkezi koordinatları
    lng: 32.8597,
  })
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [formattedTime, setFormattedTime] = useState<string | null>(null)

  const normalizeTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    if (isNaN(date.getTime())) {
      return 'Geçersiz tarih'
    }
    const hours = Math.floor((Date.now() - date.getTime()) / 3600000)
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    const seconds = Math.floor(((Date.now() - date.getTime()) % 60000) / 1000)
    if (hours > 0) {
      return `${hours} saat, ${minutes} dakika, ${seconds} saniye önce`
    } else if (minutes > 0) {
      return `${minutes} dakika, ${seconds} saniye önce`
    } else {
      return `${seconds} saniye önce`
    }
  }

  const fetchRadarData = async () => {
    try {
      setLoading(true)
      const response = await fetch('https://labs.ramazansancar.com.tr/radar/api')
      if (!response.ok) {
        throw new Error('Radar verileri alınamadı')
      }
      const data: RadarData = await response.json()
      setRadarData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  setTimeout(() => {
    if (radarData?.meta.cache_at) {
      setFormattedTime(normalizeTime(radarData.meta.cache_at))
    }
  }, 1000)

  // Kullanıcının konumunu al
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setCenterCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setZoomLevel(12) // Kullanıcının konumu için daha yakın zoom
        },
        (error) => {
          console.error('Kullanıcı konumu alınamadı:', error)
          setUserLocation(null)
        }
      )
    } else {
      console.warn('Geolocation API desteklenmiyor')
      setUserLocation(null)
    }
  }, [])

  useEffect(() => {
    if (userLocation) {
      setCenterCoordinates({
        lat: userLocation.lat,
        lng: userLocation.lng,
      })
      setZoomLevel(12)
    }
  }, [userLocation])

  // Koordinatlara göre şehir tespit fonksiyonu
  const getCityByCoordinates = (lat: number, lng: number) => {
    for (const city of citiesData.cities) {
      if (
        lat >= city.bounds.south &&
        lat <= city.bounds.north &&
        lng >= city.bounds.west &&
        lng <= city.bounds.east
      ) {
        return city.name
      }
    }
    return 'unknown'
  }

  // Radar verilerini şehirlere göre gruplandır
  const groupRadarsByCity = (markers: RadarMarker[]) => {
    const cityGroups: { [key: string]: RadarMarker[] } = {}

    markers.forEach((marker) => {
      const city = getCityByCoordinates(marker.lat, marker.lng)
      if (!cityGroups[city]) {
        cityGroups[city] = []
      }
      cityGroups[city].push(marker)
    })

    return cityGroups
  }

  // Radar verilerini fetch et
  useEffect(() => {
    fetchRadarData()
  }, [])

  // Leaflet'i CDN'den yükle
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        // CSS'i yükle
        if (!document.querySelector('link[href*="leaflet"]')) {
          const cssLink = document.createElement('link')
          cssLink.rel = 'stylesheet'
          cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
          cssLink.crossOrigin = ''
          document.head.appendChild(cssLink)
        }

        // MarkerCluster CSS'i yükle
        if (!document.querySelector('link[href*="MarkerCluster"]')) {
          const clusterCssLink = document.createElement('link')
          clusterCssLink.rel = 'stylesheet'
          clusterCssLink.href =
            'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css'
          document.head.appendChild(clusterCssLink)

          const clusterDefaultCssLink = document.createElement('link')
          clusterDefaultCssLink.rel = 'stylesheet'
          clusterDefaultCssLink.href =
            'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css'
          document.head.appendChild(clusterDefaultCssLink)
        }

        if (typeof window !== 'undefined') {
          if (!(window as any).L) {
            // Leaflet JS'i yükle
            const script = document.createElement('script')
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
            script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
            script.crossOrigin = ''

            script.onload = () => {
              // MarkerCluster JS'i yükle
              const clusterScript = document.createElement('script')
              clusterScript.src =
                'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js'
              clusterScript.onload = () => {
                // HeatMap JS'i yükle
                const heatScript = document.createElement('script')
                heatScript.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
                heatScript.onload = () => {
                  setIsLoaded(true)
                }
                document.head.appendChild(heatScript)
              }
              document.head.appendChild(clusterScript)
            }

            document.head.appendChild(script)
          } else {
            setIsLoaded(true)
          }
        }
      } catch (error) {
        console.error('Leaflet yükleme hatası:', error)
      }
    }

    loadLeaflet()
  }, [])

  // Şehir listesini çıkar - koordinat tabanlı
  const cityGroups = radarData ? groupRadarsByCity(radarData.markers) : {}
  const cities = Object.keys(cityGroups)
    .filter((city) => city !== 'unknown' && cityGroups[city].length > 0)
    .sort()

  // Filtrelenmiş radar verileri
  const filteredMarkers =
    radarData?.markers.filter((marker) => {
      if (selectedCity === 'all') return true
      const markerCity = getCityByCoordinates(marker.lat, marker.lng)
      return markerCity === selectedCity
    }) || []

  // Haritayı oluştur
  useEffect(() => {
    if (!isLoaded || !radarData || mapInstance) return

    const L = (window as any).L
    if (!L || !L.markerClusterGroup || !L.heatLayer) return

    // Harita container'ını temizle
    const container = document.getElementById('radar-map-container')
    if (!container) return

    container.innerHTML = ''

    try {
      // Harita oluştur - Türkiye merkezli, daha yakın zoom
      mapRef.current = L.map('radar-map-container').setView(
        [centerCoordinates.lat, centerCoordinates.lng],
        zoomLevel
      )

      // Tile layer ekle
      L.tileLayer(getTileLayer(mapType).url, {
        attribution: getTileLayer(mapType).attribution,
        maxZoom: getTileLayer(mapType).maxZoom,
        subdomains: getTileLayer(mapType).subdomains,
      }).addTo(mapRef.current)

      // Heat map layer oluştur
      const heatData = filteredMarkers.map((radar) => [radar.lat, radar.lng, 1])
      const heatLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 12,
        minOpacity: 0.4,
        gradient: {
          0.0: 'rgba(0, 0, 255, 0.6)',
          0.2: 'rgba(0, 255, 255, 0.6)',
          0.4: 'rgba(0, 255, 0, 0.6)',
          0.6: 'rgba(255, 255, 0, 0.6)',
          0.8: 'rgba(255, 165, 0, 0.6)',
          1.0: 'rgba(255, 0, 0, 0.8)',
        },
      }).addTo(mapRef.current)

      // Marker cluster grubu oluştur
      const markers = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount()
          let size = 'small'
          let color = '#3b82f6'

          if (count > 100) {
            size = 'large'
            color = '#dc2626'
          } else if (count > 20) {
            size = 'medium'
            color = '#f59e0b'
          }

          return L.divIcon({
            html: `<div style="
            background: linear-gradient(135deg, ${color}, ${color}dd);
            color: white;
            border-radius: 50%;
            text-align: center;
            font-weight: bold;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${size === 'large' ? '16px' : size === 'medium' ? '14px' : '12px'};
          ">${count}</div>`,
            className: `marker-cluster marker-cluster-${size}`,
            iconSize: L.point(
              size === 'large' ? 60 : size === 'medium' ? 50 : 40,
              size === 'large' ? 60 : size === 'medium' ? 50 : 40
            ),
          })
        },
      })

      // Radar icon oluştur
      const createRadarIcon = () => {
        return L.divIcon({
          className: 'custom-radar-icon',
          html: `
          <div style="
            background-color: #dc2626;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          ">
            <div style="
              width: 12px;
              height: 12px;
              background-color: white;
              border-radius: 50%;
            "></div>
            <div style="
              position: absolute;
              top: -8px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-bottom: 8px solid #dc2626;
            "></div>
          </div>
        `,
          iconSize: [24, 32],
          iconAnchor: [12, 32],
          popupAnchor: [0, -32],
        })
      }

      // Radar markerlarını cluster grubuna ekle
      filteredMarkers.forEach((radar) => {
        const marker = L.marker([radar.lat, radar.lng], {
          icon: createRadarIcon(),
        })

        // Popup içeriği
        const popupContent = `
        <div style="font-size: 14px; line-height: 1.4; min-width: 250px; max-width: 300px;">
          <div style="font-weight: bold; color: #dc2626; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 16px;">📡</span>
            Trafik Radarı
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Lokasyon:</strong><br>
            <span style="font-size: 13px;">${radar.name}</span>
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Şehir:</strong> ${getCityByCoordinates(radar.lat, radar.lng)}
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Kaynak:</strong> ${radar.source === 'official' ? 'Resmi' : 'Kullanıcı'}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            <strong>Koordinatlar:</strong> ${radar.lat.toFixed(6)}, ${radar.lng.toFixed(6)}
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">
            <a href="https://www.google.com/maps?q=${radar.lat},${radar.lng}"
               target="_blank"
               rel="noopener noreferrer"
               style="color: #2563eb; text-decoration: none; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">
              📍 Google Maps'te Aç
            </a>
          </div>
        </div>
      `

        marker.bindPopup(popupContent)
        markers.addLayer(marker)
      })

      // Cluster grubunu haritaya ekle
      mapRef.current.addLayer(markers)
      setMapInstance(mapRef.current)
    } catch (error) {
      console.error('Harita oluşturma hatası:', error)
    }
  }, [isLoaded, radarData, filteredMarkers, mapType])

  // Map type değiştiğinde tile layer'ı güncelle
  useEffect(() => {
    if (!mapInstance || !isLoaded) return

    const L = (window as any).L
    if (!L) return

    // Mevcut tile layer'ları temizle
    mapInstance.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstance.removeLayer(layer)
      }
    })

    // Yeni tile layer ekle
    L.tileLayer(getTileLayer(mapType).url, {
      attribution: getTileLayer(mapType).attribution,
      maxZoom: getTileLayer(mapType).maxZoom,
      subdomains: getTileLayer(mapType).subdomains,
    }).addTo(mapInstance)

    if (userLocation) {
      var circleMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        weight: 2,
        fillColor: 'blue',
        color: 'white',
        fillOpacity: 1.0,
        radius: 8,
        animation: true,
      })
      circleMarker.bindPopup('Kullanıcı Konumu')
      circleMarker.addTo(mapRef.current)
    }
  }, [mapType, mapInstance, isLoaded, userLocation])

  // Şehir filtresi değiştiğinde haritayı yeniden oluştur
  useEffect(() => {
    if (mapInstance) {
      mapInstance.remove()
      setMapInstance(null)
    }
  }, [selectedCity])

  useEffect(() => {
    if (selectedCity !== 'all' && selectedCity !== 'unknown') {
      // Seçilen şehir için koordinatları al
      const cityData = citiesData.cities.find(
        (city) => city.name.toLowerCase() === selectedCity.toLowerCase()
      )
      if (cityData) {
        setCenterCoordinates({
          lat: cityData.lat,
          lng: cityData.lng,
        })
        setZoomLevel(9) // Şehir için daha yakın zoom
      }
    } else {
      // Tüm şehirler için merkezi koordinatları kullan
      setCenterCoordinates({
        lat: 39.0,
        lng: 35.0,
      })
      setZoomLevel(6) // Tüm Türkiye için daha uzak zoom
    }
  }, [selectedCity])

  useEffect(() => {
    if (mapInstance) {
      mapInstance.setView([centerCoordinates.lat, centerCoordinates.lng], zoomLevel)
    }
  }, [centerCoordinates, zoomLevel, mapInstance])

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapInstance) {
        mapInstance.remove()
        setMapInstance(null)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-lg bg-white shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-600">Radar verileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-lg bg-white shadow-sm">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-red-500" />
          <p className="text-red-600">Hata: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            title="Sayfayı yeniden yükle"
            aria-label="Sayfayı yeniden yükle"
            aria-live="polite"
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Yeniden Dene
          </button>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-96 w-full items-center justify-center rounded-lg bg-white shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-green-500" />
          <p className="text-gray-600">Harita yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* İstatistikler */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <Radar className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Toplam Radar</p>
              <p className="text-2xl font-bold text-gray-900">
                {radarData?.meta.count.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Görüntülenen</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredMarkers.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={`animate-pulse rounded-full p-2 ${
                typeof radarData?.meta.cache_at === 'number' &&
                radarData.meta.cache_at * 1000 < Date.now() + 900 * 1000
                  ? 'bg-green-100'
                  : 'bg-yellow-100'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full ${
                  typeof radarData?.meta.cache_at === 'number' &&
                  radarData.meta.cache_at * 1000 < Date.now() + 900 * 1000
                    ? 'bg-green-600'
                    : 'bg-yellow-600'
                }`}
              ></div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Veri Son Güncellenme Zamanı</p>
              <p
                className={`text-lg font-semibold ${
                  typeof radarData?.meta.cache_at === 'number' &&
                  radarData.meta.cache_at * 1000 < Date.now() + 900 * 1000
                    ? 'text-green-600'
                    : 'text-yellow-600'
                }`}
              >
                {formattedTime && <span>{formattedTime || '0 saniye'}</span>}
              </p>
              <p className="text-xs text-gray-500">
                {typeof radarData?.meta.cache_at === 'number'
                  ? `Son güncelleme: ${new Date(radarData.meta.cache_at * 1000).toLocaleString(
                      'tr-TR',
                      {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }
                    )}`
                  : 'Veri güncelleme zamanı bilinmiyor'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kontroller */}
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Harita Türü */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Harita:</span>
            {mapTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setMapType(type.value as 'osm' | 'arcGIS' | 'google')}
                className={`flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors ${
                  mapType === type.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <img src={type.logo} alt={`${type.label} logo`} className="mr-1 inline h-4 w-4" />
                {type.label}
              </button>
            ))}
            {userLocation && (
              <button
                onClick={() => {
                  if (mapInstance) {
                    mapInstance.setView([userLocation.lat, userLocation.lng], 12)
                  }
                }}
                className="ml-2 rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                title="Kullanıcı konumuna git"
              >
                <MapPin className="inline h-4 w-4" />
                Konumum
              </button>
            )}
            {!userLocation && (
              <div className="ml-2 flex items-center gap-2 rounded border bg-yellow-100 p-2 text-sm text-gray-500">
                <MessageCircleWarning className="h-4 w-4" />
                Konum izni verilmedi
                <div
                  className="flex cursor-pointer items-center gap-1 rounded bg-blue-100 px-2 py-1 text-blue-600 hover:underline"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setUserLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                          })
                        },
                        (error) => {
                          console.error('Kullanıcı konumu alınamadı:', error)
                        }
                      )
                    } else {
                      alert('Geolocation API desteklenmiyor')
                    }
                  }}
                >
                  <MapPin className="inline h-4 w-4" />
                  Konumu Al
                </div>
              </div>
            )}
          </div>

          {/* Şehir Filtresi */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Şehir:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="rounded border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
              title="Şehir seçin"
            >
              <option value="all">Tümü ({radarData?.meta.count})</option>
              <option value="unknown">Bilinmeyen ({cityGroups['unknown']?.length || 0})</option>
              {cities.map((city) => {
                const count = cityGroups[city]?.length || 0
                return (
                  <option key={city} value={city}>
                    {city} ({count})
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Harita */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="relative h-[600px] w-full overflow-hidden rounded-lg">
          <div id="radar-map-container" className="h-full w-full" />
          <div className="absolute bottom-4 left-4 z-[500] rounded bg-white/90 px-3 py-2 text-sm text-gray-600 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span>Trafik Radarı</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span>Kullanıcı Konumu</span>
            </div>
          </div>
        </div>
      </div>

      {/*<div className="rounded-lg bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-gray-900">Hızlı Erişim</h3>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://www.google.com/maps/@39.9334,32.8597,6z"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-blue-100 px-3 py-2 text-sm text-blue-700 hover:bg-blue-200"
          >
            <ExternalLink className="h-4 w-4" />
            Google Maps'te Türkiye
          </a>
          <a
            href="https://www.openstreetmap.org/#map=6/39.9334/32.8597"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-green-100 px-3 py-2 text-sm text-green-700 hover:bg-green-200"
          >
            <ExternalLink className="h-4 w-4" />
            OpenStreetMap'te Türkiye
          </a>
          <a
            href="https://labs.ramazansancar.com.tr/radar/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-purple-100 px-3 py-2 text-sm text-purple-700 hover:bg-purple-200"
          >
            <ExternalLink className="h-4 w-4" />
            API Verilerini Görüntüle
          </a>
        </div>
      </div>*/}
    </div>
  )
}
