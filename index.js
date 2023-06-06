const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { Telegraf } = require('telegraf');

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Route to display server uptime
app.get('/', (req, res) => {
  const uptime = process.uptime();
  res.send(`Server uptime: ${uptime} seconds`);
});

app.listen(port, () => {
  console.log(`Express app is listening on port ${port}`);
});


function modifyAndSignAPK(apkFilePath) {
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
    return null;
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

  searchAndReplaceStrings(outputDir, regexPatterns);

  // Step 4: Recompile the modified files into an APK using apktool
  try {
    const recompileCommand = `apktool b ${outputDir} -o modified.apk`;
    execSync(recompileCommand);
    console.log('APK recompiled successfully.');
  } catch (error) {
    console.error('Failed to recompile APK:', error);
    return null;
  }

  // Step 5: Sign the recompiled APK using apksigner
  try {
    const keystorePath = 'misfitsdev.jks';
    const keystorePassword = 'misfitsdev';
    const keystoreAlias = 'misfitsdev';
    const keyPassword = 'misfits';

    const signCommand = `apksigner sign --ks ${keystorePath} --ks-key-alias ${keystoreAlias} --ks-pass pass:${keystorePassword} --key-pass pass:${keyPassword} --in modified.apk --out modified_signed.apk`;

    execSync(signCommand);
    console.log('APK signed successfully.');

    // Delete the unsigned APK
    fs.unlinkSync('modified.apk');

    // Return the path of the signed APK
    const signedAPKPath = path.join(__dirname, 'modified_signed.apk');
    return signedAPKPath;
  } catch (error) {
    console.error('Failed to sign APK:', error);
    return null;
  }
}

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

// Replace 'YOUR_API_TOKEN' with your actual API token
const bot = new Telegraf('6021834758:Token');

// Handle the '/start' command
bot.start((ctx) => {
  ctx.reply('Welcome to the APK Bot! Send me an APK file, and I will process it.');
});

// // Handle the APK file
// bot.on('document', async (ctx) => {
//   const file = ctx.message.document;

//   // Check if the file is an APK
//   if (file.mime_type === 'application/vnd.android.package-archive') {
//     const fileId = file.file_id;

    

//     try {
//       // Get the file path from Telegram API
//        const waitMessage = await ctx.reply('Please wait while processing the APK file...');

    
//       const fileInfo = await bot.telegram.getFile(fileId);
//       const downloadUrl = `https://api.telegram.org/file/bot${bot.token}/${fileInfo.file_path}`;

//       // Download the APK file
//       const downloadedFilePath = path.join(__dirname, `input.apk`);
//       await downloadFile(downloadUrl, downloadedFilePath);

//       // Process and sign the APK
//       const signedAPKPath = modifyAndSignAPK(downloadedFilePath);

//       if (signedAPKPath) {
//         console.log('Signed APK:', signedAPKPath);
//         // Send the signed APK back to the user or perform further operations
//         await ctx.replyWithDocument({ source: signedAPKPath });
//       } else {
//         console.log('Failed to modify and sign APK.');
//         await ctx.reply('Sorry, an error occurred while processing the APK file.');
//       }

//       // Delete the downloaded APK file
//       fs.unlinkSync(downloadedFilePath);
//     } catch (error) {
//       console.error('Error:', error);
//       await ctx.reply('Sorry, an error occurred while processing the APK file.');
//     }
//   } else {
//     await ctx.reply('Please send a valid APK file.');
//   }
// });


// Handle the APK file
bot.on('document', async (ctx) => {
  const file = ctx.message.document;

  console.log(ctx);

  // Check if the file is an APK
  if (file.mime_type === 'application/vnd.android.package-archive') {
    const fileId = file.file_id;
    const filePath = bot.telegram.getFileLink(fileId);

    try {
      // Send a "Please wait" message
      const waitMessage = await ctx.reply('Please wait while processing the APK file...');

      // Download the APK file
      const fileInfo = await bot.telegram.getFile(fileId);
      const apkPath = `./${fileInfo.file_unique_id}.apk`;
      const downloadUrl = `https://api.telegram.org/file/bot${bot.token}/${fileInfo.file_path}`;

      // Download the APK file
      const downloadedFilePath = await bot.telegram.downloadFile(fileInfo.file_id, downloadUrl, apkPath);

      // Example usage:
      const signedAPKPath = modifyAndSignAPK(downloadedFilePath);

      if (signedAPKPath) {
        console.log('Signed APK:', signedAPKPath);
        // Send the signed APK back to the user or perform further operations
        await ctx.replyWithDocument({ source: signedAPKPath });

        // Delete the "Please wait" message after 5 seconds
        setTimeout(async () => {
          try {
            await ctx.deleteMessage(waitMessage.message_id);
            console.log('Please wait message deleted.');
          } catch (error) {
            console.error('Failed to delete please wait message:', error);
          }
        }, 5000);
      } else {
        console.log('Failed to modify and sign APK.');
      }
    } catch (error) {
      console.error('Error:', error);
      ctx.reply('Sorry, an error occurred while processing the APK file.');
    }
  } else {
    ctx.reply('Please send a valid APK file.');
  }
});

// Start the bot
bot.launch();


function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    const request = https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    request.on('error', (error) => {
      reject(error);
    });
  });
}
