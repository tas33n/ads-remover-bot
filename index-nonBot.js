const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the APK file
const apkFilePath = 'one.apk';

// Output directory for decompiled files
const outputDir = 'directory';

// Step 1: Create the output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Step 2: Run apktool to decompile the APK
try {
  const apktoolCommand = `apktool d ${apkFilePath} -o ${outputDir} -f`;
  execSync(apktoolCommand);
  console.log('APK decompiled successfully.');
} catch (error) {
  console.error('Error decompiling APK:', error);
}

// Step 3: Search and replace multiple regex patterns in smali files
const regexPatterns = [
  {
    regex: /\.method\s(public|private|static)\s\b(?!\babstract|native\b)(.*?)loadAd\(.*?\)V/,
    replacement: '$&\n    return-void',
  },
  {
    regex: /\.method\s(public|private|static)\s\b(?!\babstract|native\b)(.*?)loadAd\(.*?\)Z/,
    replacement: '$&\n    const/4 v0, 0x0\n    return v0',
  },
  {
    regex: /invoke.*loadAd\(.*?\)[VZ]/,
    replacement: '#$&',
  },
  {
    regex: /invoke.*gms.*>(loadUrl|loadDataWithBaseURL|requestInterstitialAd|showInterstitial|showVideo|showAd|loadData|onAdClicked|onAdLoaded|isLoading|loadAds|AdLoader|AdRequest|AdListener|AdView).*V/,
    replacement: '#$&',
  },
  {
    regex: /"(http.*|\/\/.*)(61\.145\.124\.238|\-ads\.|\.ad\.|\.ads\.|\.analytics\.localytics\.com|\.mobfox\.com|\.mp\.mydas\.mobi|\.plus1\.wapstart\.ru|\.scorecardresearch\.com|\.startappservice\.com|\/ad\.|\/ads|ad\-mail|ad\.*\_logging|ad\.api\.kaffnet\.com|adc3\-launch|adcolony|adinformation|adkmob|admax|admob|admost|adsafeprotected|adservice|adtag|advert|adwhirl|adz\.wattpad\.com|alta\.eqmob\.com|amazon\-*ads|amazon\.*ads|amobee|analytics|applovin|applvn|appnext|appodeal|appsdt|appsflyer|burstly|cauly|cloudfront|com\.google\.android\.gms\.ads\.identifier\.service\.START|crashlytics|crispwireless|doubleclick|dsp\.batmobil\.net|duapps|dummy|flurry|gad|getads|google\.com\/dfp|googleAds|googleads|googleapis\.*\.ad\-*|googlesyndication|googletagmanager|greystripe|gstatic|inmobi|inneractive|jumptag|live\.chartboost\.com|madnet|millennialmedia|moatads|mopub|native\_ads|pagead|pubnative|smaato|supersonicads|tapas|tapjoy|unityads|vungle|zucks).*"/,
    replacement: '"="',
  },
  // Add more regex patterns and their replacements as needed
];

function searchAndReplaceStrings(dirPath, patterns) {
  const files = fs.readdirSync(dirPath);
  let modifiedFiles = [];

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      searchAndReplaceStrings(filePath, patterns);
    } else if (stats.isFile() && file.endsWith('.smali')) {
      let fileContent = fs.readFileSync(filePath, 'utf8');
      let matches = [];

      patterns.forEach((pattern) => {
        const { regex, replacement } = pattern;
        const regexMatches = fileContent.match(regex);

        if (regexMatches) {
          matches = matches.concat(regexMatches);
          fileContent = fileContent.replace(regex, replacement);
        }
      });

      if (matches.length > 0) {
        fs.writeFileSync(filePath, fileContent, 'utf8');
        modifiedFiles.push(filePath);
      }
    }
  });

  if (modifiedFiles.length > 0) {
    console.log('Modified files:');
    modifiedFiles.forEach((file) => {
      console.log(file);
    });
  }
}

searchAndReplaceStrings(outputDir, regexPatterns);

// Step 4: Recompile the modified files into an APK using apktool
try {
  const recompileCommand = `apktool b ${outputDir} -o modified.apk`;
  execSync(recompileCommand);
  console.log('APK recompiled successfully.');
} catch (error) {
  console.error('Failed to recompile APK:', error);
}

// Step 5: Sign the recompiled APK using apksigner
try {
  // const keystorePath = 'path/to/keystore';
  // const keystoreAlias = 'alias';
  // const keystorePassword = 'password';

  const keystorePath = 'misfitsdev.jks';
    const keystorePassword = 'misfitsdev';
    const keystoreAlias = 'misfitsdev';
    const keyPassword = 'misfits';

  const signCommand = `apksigner sign --ks ${keystorePath} --ks-key-alias ${keystoreAlias} --ks-pass pass:${keystorePassword} --key-pass pass:${keyPassword} --in modified.apk --out modified_signed.apk`;

  execSync(signCommand);
  console.log('APK signed successfully.');

  // Delete the unsigned APK
  fs.unlinkSync('modified.apk');
} catch (error) {
  console.error('Failed to sign APK:', error);
}

// Step 6: Send back the signed APK
const signedAPKPath = path.join(__dirname, 'modified_signed.apk');
// Send the signed APK back to the user or perform further operations


