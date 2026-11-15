# ⚽ Tablet Futbol

İki kişinin, kendi tabletlerinden birbirine bağlanıp oynadığı basit bir futbol oyunu.
Kurulum, hesap ya da sunucu gerekmez: GitHub Pages'te çalışan statik bir web sayfasıdır.

## Nasıl oynanır

1. İki tablette de oyunun adresini açın.
2. Her oyuncu adını yazıp forma rengini seçer.
3. Biri **Oda Kur**'a basar; ekranda 4 haneli bir kod çıkar.
4. Diğeri **Odaya Katıl**'a basıp kodu girer. Geri sayımla maç başlar.

- Ekranın sol yarısına dokunup kaydırınca oyuncu hareket eder. Top, yanına gelen oyuncunun ayağına yapışır.
- Ekranın sağ yarısına dokunmak **ŞUT**: top ayağındaysa baktığın yöne vurur, değilse kısa bir atılma yapar.
- Her iki tablette de kendi kalen solda görünür; hep sağa doğru hücum edersin.
- Her takımın otomatik bir kalecisi vardır.
- **Aynı Tablette Oyna**: iki kişi tek tabletin iki ucundan oynar.
- Bilgisayarda: WASD + Boşluk (1. oyuncu), yön tuşları + Enter (2. oyuncu).

## Nasıl çalışır

- Tabletler [PeerJS](https://peerjs.com/) (WebRTC) ile doğrudan bağlanır. Eşleşme için PeerJS'in ücretsiz
  genel sunucusu kullanılır, oyun verisi tabletler arasında doğrudan akar.
- Odayı kuran tablet maçın tek gerçek kopyasını çalıştırır ve saniyede 30 kez durum gönderir;
  diğer tablet yalnızca kumanda girişini gönderir ve gelen durumu yumuşatarak çizer.
- Bütün ayarlar (saha ölçüleri, hızlar, renkler, metinler) `src/config.js` içindedir.

```
index.html          sayfa ve ekranlar
css/style.css
src/
  config.js         tüm ayarlar ve metinler
  core/             maç simülasyonu (DOM'suz, test edilebilir)
  input/            dokunmatik joystick, şut düğmesi, klavye
  render/           canvas çizimi ve yumuşatma
  audio/            sentezlenmiş ses efektleri
  net/              PeerJS bağlantısı
  sessions/         yerel / oda kuran / katılan oyun oturumları
  ui/               menü ekranları ve profil
  app.js, main.js   oyun döngüsü ve giriş noktası
vendor/             PeerJS 1.5.5 (MIT)
tests/              node:test testleri
```

## Geliştirme

```bash
npm test     # testleri çalıştırır (Node 20+)
npm start    # yerelde http://localhost:3000 adresinde açar
```
