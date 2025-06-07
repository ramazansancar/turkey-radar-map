import { RadarMap } from '@/components/radar-map'
import { Info } from 'lucide-react'
import Information from '@/components/info'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Information />
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Türkiye Radar Haritası</h1>
          <p className="mt-2 text-gray-600">Türkiye genelindeki trafik radarlarının konumları</p>
          <div className="mt-4 rounded-lg bg-gray-100 p-4 shadow-md">
            <p className="text-sm text-gray-500">
              <Info className="mr-1 inline" size={16} />
              Bu harita, Türkiye'deki trafik radarlarının konumlarını gösterir. Harita üzerinde
              radarlara tıklayarak detaylı bilgi alabilirsiniz.
              <br />
              Resmi olarak işaretli veriler{' '}
              <a
                href="https://onlineislemler.egm.gov.tr/trafik/sayfalar/edsharita.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                EGM
              </a>{' '}
              aracılığı ile sağlanmaktadır.
              <br />
              <b>Dipnot: </b>Bu sitenin <b>EGM</b> veya <b>İçişleri Bakanlığı</b> gibi resmi
              kurumlarla hiçbir bağlantısı yoktur. Sadece açık kaynaklı harita verilerini
              kullanmaktadır.
              <br />
              <b>Bilgi: </b> Verinin hızlı bir şekilde yüklenmesi için <b>15 dakikalık</b>{' '}
              önbellekleme yapılmıştır. Bu nedenle, harita üzerindeki veriler <b>15 dakikada</b> bir
              güncellenir.
            </p>
            <p></p>
          </div>
        </div>
        <RadarMap />
      </div>
    </div>
  )
}
