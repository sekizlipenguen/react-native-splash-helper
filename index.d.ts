// Splash konfigürasyonu tiplerini tanımlıyoruz
export interface AndroidConfig {
    backgroundColor: string; // Hex renk kodu (#FFFFFF gibi)
    splashImage: string; // Splash görselinin yolu
}

export interface IOSConfig {
    backgroundColor: string; // Hex renk kodu
    splashImage: string; // Splash görselinin yolu
}

export interface SplashConfig {
    android?: AndroidConfig;
    ios?: IOSConfig;
}

// Komut tipi
export interface Command {
    name: string; // Komutun adı
    description: string; // Komut açıklaması
    func: (config?: SplashConfig) => void; // Komutun çalıştırdığı fonksiyon
}

// Modül tanımı
declare const commands: Command[];

export default commands;
