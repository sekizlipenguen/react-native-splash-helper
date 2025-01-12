const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Bin dizinindeki dosyanın yolunu belirle
const binPath = path.join(process.cwd(), 'node_modules/.bin/react-native-splash-helper');

try {
  // Eğer dosya mevcutsa, önce sil
  if (fs.existsSync(binPath)) {
    fs.unlinkSync(binPath);
    console.log('Removed old bin file: react-native-splash-helper');
  }

  // Yeni dosya oluşturulmadan önce izinleri ayarla
  const newBinPath = path.join(process.cwd(), 'bin/react-native-splash-helper');
  if (fs.existsSync(newBinPath)) {
    // Yeni dosya kopyalanmadan önce izinleri kontrol et ve düzenle
    execSync(`chmod +x ${newBinPath}`);
    console.log('Updated permissions for: react-native-splash-helper');
  }
} catch (error) {
  console.error(`Error during cleanBin operation: ${error.message}`);
}
