Add-Type -AssemblyName System.Drawing

function Get-Base64Image($filePath, $maxWidth, $maxHeight, $formatName, $makeTransparent) {
    if (-not (Test-Path $filePath)) {
        Write-Error "File not found: $filePath"
        return ""
    }
    
    $img = [System.Drawing.Image]::FromFile($filePath)
    
    # Calculate new dimensions
    $ratioX = $maxWidth / $img.Width
    $ratioY = $maxHeight / $img.Height
    $ratio = [Math]::Min($ratioX, $ratioY)
    
    if ($ratio -lt 1.0) {
        $newWidth = [int]($img.Width * $ratio)
        $newHeight = [int]($img.Height * $ratio)
    } else {
        $newWidth = $img.Width
        $newHeight = $img.Height
    }
    
    # Draw scaled image
    $bmp = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # High quality settings
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.DrawImage($img, 0, 0, $newWidth, $newHeight)
    
    if ($makeTransparent) {
        # BFS Flood fill from corners
        $visited = New-Object 'bool[,]' $newWidth, $newHeight
        $queue = New-Object System.Collections.Queue
        
        $arg1 = 0, 0
        $arg2 = ($newWidth - 1), 0
        $arg3 = 0, ($newHeight - 1)
        $arg4 = ($newWidth - 1), ($newHeight - 1)
        $queue.Enqueue($arg1)
        $queue.Enqueue($arg2)
        $queue.Enqueue($arg3)
        $queue.Enqueue($arg4)
        
        while ($queue.Count -gt 0) {
            $curr = $queue.Dequeue()
            $cx = $curr[0]
            $cy = $curr[1]
            
            if ($cx -lt 0 -or $cx -ge $newWidth -or $cy -lt 0 -or $cy -ge $newHeight) { continue }
            if ($visited[$cx, $cy]) { continue }
            $visited[$cx, $cy] = $true
            
            $c = $bmp.GetPixel($cx, $cy)
            # Threshold: close to white/light grey (RGB all > 220)
            if ($c.R -gt 220 -and $c.G -gt 220 -and $c.B -gt 220) {
                $bmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                
                $argN1 = ($cx + 1), $cy
                $argN2 = ($cx - 1), $cy
                $argN3 = $cx, ($cy + 1)
                $argN4 = $cx, ($cy - 1)
                $queue.Enqueue($argN1)
                $queue.Enqueue($argN2)
                $queue.Enqueue($argN3)
                $queue.Enqueue($argN4)
            }
        }
    }
    
    $ms = New-Object System.IO.MemoryStream
    if ($formatName -eq "PNG") {
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $mime = "image/png"
    } else {
        # Save as JPEG with compression quality 80
        $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatID -eq [System.Drawing.Imaging.ImageFormat]::Jpeg.Guid }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)
        $bmp.Save($ms, $encoder, $encoderParams)
        $mime = "image/jpeg"
    }
    
    $bytes = $ms.ToArray()
    
    # Clean up
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    $ms.Dispose()
    
    $base64 = [Convert]::ToBase64String($bytes)
    return "data:$mime;base64,$base64"
}
 
# Locate HTML file recursively (supporting renamed file)
$htmlFile = Get-ChildItem -Recurse -Filter "*200*.html" | Where-Object { $_.Name -like "*聽*" } | Select-Object -First 1
$htmlPath = $htmlFile.FullName
$jiaoJuDir = $htmlFile.Directory.FullName
$imagesDir = Join-Path $jiaoJuDir "images"
 
Write-Host "Found HTML path: $htmlPath"
Write-Host "Found images directory: $imagesDir"

# Load Chinese text strings dynamically from JSON file
$jsonPath = Join-Path $htmlFile.Directory.Parent.FullName ".gemini\antigravity\brain\1b37ecc4-e16e-4f2c-a84a-b02d8b0935ca\scratch\chinese_texts.json"
if (-not (Test-Path $jsonPath)) {
    # Fallback to local config path if needed
    $jsonPath = "C:\Users\User001\.gemini\antigravity\brain\1b37ecc4-e16e-4f2c-a84a-b02d8b0935ca\scratch\chinese_texts.json"
}
Write-Host "Loading Chinese strings from: $jsonPath"
$jsonText = [System.IO.File]::ReadAllText($jsonPath, [System.Text.Encoding]::UTF8)
$texts = ConvertFrom-Json $jsonText

# Find image files by filters
$file100 = (Get-ChildItem $imagesDir -Filter "100.jpg" | Select-Object -First 1).FullName
$file10 = (Get-ChildItem $imagesDir -Filter "10.jpg" | Select-Object -First 1).FullName
$file1 = (Get-ChildItem $imagesDir -Filter "1.jpg" | Select-Object -First 1).FullName
$fileHBlock = (Get-ChildItem $imagesDir -Filter "*hundred*" | Select-Object -First 1).FullName
$fileTBlock = (Get-ChildItem $imagesDir -Filter "*ten*" | Select-Object -First 1).FullName
$fileOBlock = (Get-ChildItem $imagesDir -Filter "*one*" | Select-Object -First 1).FullName

Write-Host "Encoding images to Base64..."
$coin100 = Get-Base64Image $file100 240 120 "JPEG" $false
$coin10 = Get-Base64Image $file10 120 120 "PNG" $true
$coin1 = Get-Base64Image $file1 100 100 "PNG" $true
$block100 = Get-Base64Image $fileHBlock 200 200 "PNG" $true
$block10 = Get-Base64Image $fileTBlock 60 200 "PNG" $true
$block1 = Get-Base64Image $fileOBlock 80 80 "PNG" $true

# Read HTML file using UTF-8
$content = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)

# Template for IMAGES and Handwriting Logic using single quotes to avoid escaping
$template = @'
        const IMAGES = {
            coin100: "__COIN100__",
            coin10: "__COIN10__",
            coin1: "__COIN1__",
            block100: "__BLOCK100__",
            block10: "__BLOCK10__",
            block1: "__BLOCK1__"
        };

        let mode = 'coin'; // 'coin' or 'block'

        let canvas, ctx;
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        let isCanvasLocked = false;
        let currentItem = null;

        function initHandwritingCanvas() {
            canvas = document.getElementById('handwriting-canvas');
            if (!canvas) return;
            ctx = canvas.getContext('2d');
            
            ctx.strokeStyle = '#1e3a8a'; // 深藍色
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.lineWidth = 5;

            function getCoords(e) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                
                const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                
                return {
                    x: (clientX - rect.left) * scaleX,
                    y: (clientY - rect.top) * scaleY
                };
            }

            function startDrawing(e) {
                if (isCanvasLocked) return;
                isDrawing = true;
                const coords = getCoords(e);
                lastX = coords.x;
                lastY = coords.y;
            }

            function draw(e) {
                if (!isDrawing || isCanvasLocked) return;
                const coords = getCoords(e);
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(coords.x, coords.y);
                ctx.stroke();
                lastX = coords.x;
                lastY = coords.y;
            }

            function stopDrawing() {
                isDrawing = false;
            }

            // Mouse events
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseleave', stopDrawing);

            // Touch events for mobile/tablet
            canvas.addEventListener('touchstart', (e) => {
                startDrawing(e);
                e.preventDefault();
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                draw(e);
                e.preventDefault();
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
                stopDrawing();
                e.preventDefault();
            }, { passive: false });
        }

        function clearCanvas() {
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            isCanvasLocked = false;
            playSound('click');
        }

        function submitHandwrittenAns() {
            playSound('click');
            isCanvasLocked = true;
            quantityVerified = true;
            
            const feedback = document.getElementById('feedback-text');
            feedback.innerHTML = "__FEEDBACK_SPEECH_OK__";
            feedback.className = "text-md font-bold text-green-700";

            document.getElementById('speech-check-div').classList.remove('hidden');
            document.getElementById('speech-status').innerText = "__SPEECH_STATUS_PULSE__";
            document.getElementById('speech-status').className = "text-sm font-black text-stone-700 animate-pulse";
        }

        function manualSpeechInput() {
            playSound('click');
            const typed = prompt(`__MANUAL_SPEECH_TITLE__${getChineseStandardReading(targetValue)}）：`);
            if (typed) {
                verifySpeech(typed.trim());
            }
        }

        function updateShoppingProblemText() {
            if (questionType === 1 && currentItem) {
                const toolName = mode === 'coin' ? '錢幣' : '積木';
                const actionName = mode === 'coin' ? '付錢' : '排';
                document.getElementById('problem-text').innerHTML = `買一個 <b>${currentItem.name} ${currentItem.icon}</b> 要 <b>${targetValue}</b> 元，怎麼${actionName}會剛好？用${toolName}排排看。`;
            }
        }
'@

# Replace Base64 placeholders
$imagesBlock = $template.Replace("__COIN100__", $coin100).Replace("__COIN10__", $coin10).Replace("__COIN1__", $coin1).Replace("__BLOCK100__", $block100).Replace("__BLOCK10__", $block10).Replace("__BLOCK1__", $block1)

# Replace Chinese string placeholders
$imagesBlock = $imagesBlock.Replace("__FEEDBACK_SPEECH_OK__", $texts.feedback_speech_ok).Replace("__SPEECH_STATUS_PULSE__", $texts.speech_status_pulse).Replace("__MANUAL_SPEECH_TITLE__", $texts.manual_speech_title)

Write-Host "Replacing references in HTML..."

# 1. Replace the mode variable definition with the entire IMAGES & Canvas block
if ($content.Contains("        let mode = 'coin'; // 'coin' or 'block'")) {
    $content = $content.Replace("        let mode = 'coin'; // 'coin' or 'block'", $imagesBlock)
} else {
    $content = $content.Replace("        let mode = 'coin';", $imagesBlock)
}

# 2. Update selectMode to use Base64 and the new button text labels
$oldSelectMode = @'
        function selectMode(m) {
            mode = m;
            const coinBtn = document.getElementById('btn-coin-mode');
            const blockBtn = document.getElementById('btn-block-mode');
            if (mode === 'coin') {
                coinBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all bg-amber-500 text-white border border-amber-600";
                blockBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all bg-white text-amber-700 border border-amber-300 hover:bg-amber-100";
                
                document.getElementById('btn-txt-hundred').innerText = "+100元";
                document.getElementById('btn-txt-ten').innerText = "+10元";
                document.getElementById('btn-txt-one').innerText = "+1元";

                document.getElementById('img-btn-hundred').src = "images/100元.jpg";
                document.getElementById('img-btn-hundred').className = "w-16 h-8 object-contain";
                document.getElementById('img-btn-ten').src = "images/10元.jpg";
                document.getElementById('img-btn-ten').className = "w-10 h-10 object-contain";
                document.getElementById('img-btn-one').src = "images/1元.jpg";
                document.getElementById('img-btn-one').className = "w-8 h-8 object-contain";
            } else {
                blockBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all bg-amber-500 text-white border border-amber-600";
                coinBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all bg-white text-amber-700 border border-amber-300 hover:bg-amber-100";
                
                document.getElementById('btn-txt-hundred').innerText = "+百格板";
                document.getElementById('btn-txt-ten').innerText = "+十條";
                document.getElementById('btn-txt-one').innerText = "+個位積木";

                document.getElementById('img-btn-hundred').src = "images/base10_hundred.png";
                document.getElementById('img-btn-hundred').className = "w-12 h-12 object-contain";
                document.getElementById('img-btn-ten').src = "images/base10_ten.png";
                document.getElementById('img-btn-ten').className = "w-4 h-12 object-contain";
                document.getElementById('img-btn-one').src = "images/base10_one.png";
                document.getElementById('img-btn-one').className = "w-6 h-6 object-contain";
            }
            clearWorkspace();
            renderWorkspace();
        }
'@

$newSelectMode = @'
        function selectMode(m) {
            mode = m;
            const coinBtn = document.getElementById('btn-coin-mode');
            const blockBtn = document.getElementById('btn-block-mode');
            if (mode === 'coin') {
                coinBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all bg-amber-500 text-white border border-amber-600";
                blockBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all bg-white text-amber-700 border border-amber-300 hover:bg-amber-100";
                
                document.getElementById('btn-txt-hundred').innerText = "+100元";
                document.getElementById('btn-txt-ten').innerText = "+10元";
                document.getElementById('btn-txt-one').innerText = "+1元";

                document.getElementById('img-btn-hundred').src = IMAGES.coin100;
                document.getElementById('img-btn-hundred').className = "w-16 h-8 object-contain";
                document.getElementById('img-btn-ten').src = IMAGES.coin10;
                document.getElementById('img-btn-ten').className = "w-10 h-10 object-contain";
                document.getElementById('img-btn-one').src = IMAGES.coin1;
                document.getElementById('img-btn-one').className = "w-8 h-8 object-contain";
            } else {
                blockBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all bg-amber-500 text-white border border-amber-600";
                coinBtn.className = "px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all bg-white text-amber-700 border border-amber-300 hover:bg-amber-100";
                
                document.getElementById('btn-txt-hundred').innerText = "+1個百";
                document.getElementById('btn-txt-ten').innerText = "+1個十";
                document.getElementById('btn-txt-one').innerText = "+1個一";

                document.getElementById('img-btn-hundred').src = IMAGES.block100;
                document.getElementById('img-btn-hundred').className = "w-12 h-12 object-contain";
                document.getElementById('img-btn-ten').src = IMAGES.block10;
                document.getElementById('img-btn-ten').className = "w-4 h-12 object-contain";
                document.getElementById('img-btn-one').src = IMAGES.block1;
                document.getElementById('img-btn-one').className = "w-6 h-6 object-contain";
            }
            clearWorkspace();
            renderWorkspace();
            updateShoppingProblemText();
        }
'@

$content = $content.Replace($oldSelectMode, $newSelectMode)

# 3. Replace image references in renderWorkspace
$content = $content.Replace("const imgHundred = mode === 'coin' ? 'images/100元.jpg' : 'images/base10_hundred.png';", 'const imgHundred = mode === ''coin'' ? IMAGES.coin100 : IMAGES.block100;')
$content = $content.Replace("const imgTen = mode === 'coin' ? 'images/10元.jpg' : 'images/base10_ten.png';", 'const imgTen = mode === ''coin'' ? IMAGES.coin10 : IMAGES.block10;')
$content = $content.Replace("const imgOne = mode === 'coin' ? 'images/1元.jpg' : 'images/base10_one.png';", 'const imgOne = mode === ''coin'' ? IMAGES.coin1 : IMAGES.block1;')

# 4. Replace initGame() logic using dynamic JSON strings to avoid any literal Chinese inside powershell
$newInitGameTemplate = @'
        function initGame() {
            questionType = Math.floor(Math.random() * 4) + 1;
            
            quantityVerified = false;
            speechVerified = false;
            
            // Clean inputs & panels
            document.getElementById('handwriting-div').classList.add('hidden');
            document.getElementById('verify-quantity-div').classList.remove('hidden');
            document.getElementById('speech-check-div').classList.add('hidden');
            document.getElementById('speech-result-div').classList.add('hidden');
            document.getElementById('btn-audio-replay').classList.add('hidden');
            document.getElementById('target-display-card').classList.remove('hidden');
            document.getElementById('placement-buttons-div').classList.remove('hidden');
            document.getElementById('live-sum-display').classList.add('hidden'); // Keep hidden
            
            clearWorkspace();

            // Set tags
            const tag = document.getElementById('question-type-tag');
            if (questionType === 1) tag.innerText = "看商品做數";
            else if (questionType === 2) tag.innerText = "聽音做數";
            else if (questionType === 3) tag.innerText = "逆向數錢";
            else if (questionType === 4) tag.innerText = "位值合成";

            // Generate values
            if (questionType === 1) {
                // Type 1: Shopping
                const item = shoppingItems[Math.floor(Math.random() * shoppingItems.length)];
                currentItem = item;
                targetValue = item.price;
                updateShoppingProblemText();
                document.getElementById('target-title').innerText = "商品價格";
                document.getElementById('target-value').innerText = targetValue;
            } 
            else if (questionType === 2) {
                // Type 2: Audio only (hide target display text)
                targetValue = Math.floor(Math.random() * 100) + 100; // 100 to 199
                
                document.getElementById('problem-text').innerHTML = `🐼 聽聲音挑戰！「請仔細聽播放的聲音，並在定位版排出對應的數量！」`;
                document.getElementById('target-display-card').classList.add('hidden');
                document.getElementById('btn-audio-replay').classList.remove('hidden');
                
                // Speak immediately
                setTimeout(() => { playAudioQuestion(targetValue); }, 500);
            } 
            else if (questionType === 3) {
                // Type 3: Reverse counting
                targetValue = Math.floor(Math.random() * 100) + 100; // 100 to 199
                
                // Pre-populate workspace
                placedHundreds = Math.floor(targetValue / 100);
                placedTens = Math.floor((targetValue % 100) / 10);
                placedOnes = targetValue % 10;
                renderWorkspace();

                document.getElementById('problem-text').innerHTML = "__PROBLEM_TEXT_TYPE3__";
                document.getElementById('target-display-card').classList.add('hidden');
                
                // Hide adding controls and verify quantities button
                document.getElementById('placement-buttons-div').classList.add('hidden');
                document.getElementById('verify-quantity-div').classList.add('hidden');
                document.getElementById('live-sum-display').classList.add('hidden');
                
                // Show handwriting canvas area
                document.getElementById('handwriting-div').classList.remove('hidden');
                clearCanvas();
            } 
            else if (questionType === 4) {
                // Type 4: PV composition
                const hundreds = Math.random() > 0.5 ? 1 : 0;
                let tens = 0;
                let ones = 0;
                
                if (hundreds === 0) {
                    tens = Math.floor(Math.random() * 8) + 11; // 11 to 18 tens -> 110 to 180
                    ones = Math.floor(Math.random() * 15) + 3;  // 3 to 17 ones
                } else {
                    tens = Math.floor(Math.random() * 8) + 2;   // 2 to 9 tens
                    ones = Math.floor(Math.random() * 12) + 3;  // 3 to 14 ones
                }
                
                targetValue = (hundreds * 100) + (tens * 10) + ones;
                
                if (targetValue > 200) {
                    targetValue = 186;
                    tens = 18;
                    ones = 6;
                }

                // Construct text
                let text = "__PROBLEM_TEXT_TYPE4_START__";
                if (hundreds > 0) text += `<b>${hundreds}__PROBLEM_TEXT_TYPE4_HUNDREDS__</b>、`;
                text += `<b>${tens}__PROBLEM_TEXT_TYPE4_TENS__</b>和<b>${ones}__PROBLEM_TEXT_TYPE4_ONES__</b>__PROBLEM_TEXT_TYPE4_END__`;

                document.getElementById('problem-text').innerHTML = text;
                document.getElementById('target-display-card').classList.add('hidden');
                
                document.getElementById('placement-buttons-div').classList.add('hidden');
                document.getElementById('verify-quantity-div').classList.add('hidden');
                document.getElementById('live-sum-display').classList.add('hidden');
                
                // Show handwriting canvas area
                document.getElementById('handwriting-div').classList.remove('hidden');
                clearCanvas();
            }

            document.getElementById('feedback-text').innerText = "__INIT_FEEDBACK_TEXT__";
            document.getElementById('feedback-text').className = "text-md font-bold text-amber-900";
        }
'@

# Replace Chinese string placeholders in initGame
$newInitGame = $newInitGameTemplate.Replace("__PROBLEM_TEXT_TYPE3__", $texts.problem_text_type3).Replace("__PROBLEM_TEXT_TYPE4_START__", $texts.problem_text_type4_start).Replace("__PROBLEM_TEXT_TYPE4_HUNDREDS__", $texts.problem_text_type4_hundreds).Replace("__PROBLEM_TEXT_TYPE4_TENS__", $texts.problem_text_type4_tens).Replace("__PROBLEM_TEXT_TYPE4_ONES__", $texts.problem_text_type4_ones).Replace("__PROBLEM_TEXT_TYPE4_END__", $texts.problem_text_type4_end).Replace("__INIT_FEEDBACK_TEXT__", $texts.init_feedback_text)

# Regex match to replace initGame function
$initGameRegex = '(?s)function initGame\(\)\s*\{.*?\}\r?\n\s*//\s*Play\s*audio\s*TTS'
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $initGameRegex, "$newInitGame`r`n`r`n        // Play audio TTS")

# 5. Replace verification logic with placeholder-based JS code
$newVerifyLogicTemplate = @'
        // Verify Quantity on board (Type 1 & 2) (No digit hints)
        function verifyQuantity() {
            const sumVal = (placedHundreds * 100) + (placedTens * 10) + placedOnes;
            const feedback = document.getElementById('feedback-text');

            if (sumVal === targetValue) {
                playSound('correct');
                quantityVerified = true;

                feedback.innerHTML = "__FEEDBACK_QTY_OK__";
                feedback.className = "text-md font-bold text-green-700";
                
                document.getElementById('speech-check-div').classList.remove('hidden');
                document.getElementById('speech-status').innerText = "__SPEECH_STATUS_PULSE__";
                document.getElementById('speech-status').className = "text-sm font-black text-stone-700 animate-pulse";
            } else {
                playSound('wrong');
                if (sumVal > targetValue) {
                    feedback.innerHTML = "__FEEDBACK_QTY_TOO_MANY__";
                } else {
                    feedback.innerHTML = "__FEEDBACK_QTY_TOO_FEW__";
                }
                feedback.className = "text-md font-bold text-red-600";
            }
        }

        // AI Speech Recognition
        function toggleRecording() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                // Fallback if not supported
                manualSpeechInput();
                return;
            }

            if (isRecording) {
                recognition.stop();
                return;
            }

            playSound('click');
            recognition = new SpeechRecognition();
            recognition.lang = 'zh-TW';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                isRecording = true;
                const recBtn = document.getElementById('btn-record');
                recBtn.classList.add('mic-active');
                document.getElementById('speech-status').innerText = "__SPEECH_STATUS_REC__";
                document.getElementById('speech-status').className = "text-sm font-black text-red-600";
            };

            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript.trim().replace(/[。？，！\s]/g, '');
                verifySpeech(text);
            };

            recognition.onerror = (e) => {
                console.error(e);
                let errMsg = "__SPEECH_STATUS_ERR__";
                if (e.error === 'not-allowed') {
                    errMsg = "__SPEECH_STATUS_ERR_ALLOWED__";
                }
                document.getElementById('speech-status').innerText = errMsg + ` (${e.error})`;
                document.getElementById('speech-status').className = "text-sm font-bold text-red-500";
                
                // Fallback prompt immediately if they want to type it
                setTimeout(() => {
                    manualSpeechInput();
                }, 500);
            };

            recognition.onend = () => {
                isRecording = false;
                const recBtn = document.getElementById('btn-record');
                recBtn.classList.remove('mic-active');
            };

            recognition.start();
        }

        function verifySpeech(transcript) {
            document.getElementById('speech-result-div').classList.remove('hidden');
            document.getElementById('speech-result-text').innerText = transcript;

            const acceptable = getAcceptableReadings(targetValue);
            const feedback = document.getElementById('feedback-text');

            // Format bad digit pronunciation warnings, e.g. "一四七" instead of "一百四十七"
            const digitSpelling = targetValue.toString().split('').map(d => {
                const map = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
                return map[parseInt(d)];
            }).join(''); // e.g. "一四七"

            if (acceptable.includes(transcript)) {
                playSound('correct');
                speechVerified = true;
                
                if (questionType === 3 || questionType === 4) {
                    feedback.innerHTML = `__FEEDBACK_SPEECH_VERIFY_HANDWRITTEN__${targetValue}__FEEDBACK_SPEECH_VERIFY_HANDWRITTEN_SUFFIX__`;
                } else {
                    feedback.innerHTML = `__FEEDBACK_SPEECH_VERIFY_STANDARD__${transcript}__FEEDBACK_SPEECH_VERIFY_STANDARD_SUFFIX__`;
                }
                feedback.className = "text-md font-bold text-green-700 font-extrabold animate-bounce";
                
                document.getElementById('speech-status').innerText = "__SPEECH_STATUS_SUCCESS__";
                document.getElementById('speech-status').className = "text-sm font-black text-green-600";
            } else if (transcript.includes(digitSpelling) || transcript === digitSpelling) {
                playSound('wrong');
                feedback.innerHTML = `__SPEECH_STATUS_ERR_PRONOUNCE__${transcript}__SPEECH_STATUS_ERR_PRONOUNCE_MID__${getChineseStandardReading(targetValue)}__SPEECH_STATUS_ERR_PRONOUNCE_SUFFIX__`;
                feedback.className = "text-md font-bold text-red-600";
                
                document.getElementById('speech-status').innerText = "__SPEECH_STATUS_ERR_PRONOUNCE_STATUS__";
                document.getElementById('speech-status').className = "text-sm font-bold text-red-500";
            } else {
                playSound('wrong');
                feedback.innerHTML = `__SPEECH_STATUS_MISMATCH__${transcript}__SPEECH_STATUS_MISMATCH_MID__${targetValue}__SPEECH_STATUS_MISMATCH_SUFFIX__`;
                feedback.className = "text-md font-bold text-red-600";

                document.getElementById('speech-status').innerText = "__SPEECH_STATUS_MISMATCH_STATUS__";
                document.getElementById('speech-status').className = "text-sm font-bold text-red-500";
            }
        }

        function nextQuestion() {
            playSound('click');
            initGame();
        }
'@

# Replace Chinese string placeholders in verification logic
$newVerifyLogic = $newVerifyLogicTemplate.Replace("__FEEDBACK_QTY_OK__", $texts.feedback_qty_ok).Replace("__FEEDBACK_QTY_TOO_MANY__", $texts.feedback_qty_too_many).Replace("__FEEDBACK_QTY_TOO_FEW__", $texts.feedback_qty_too_few).Replace("__SPEECH_STATUS_PULSE__", $texts.speech_status_pulse).Replace("__SPEECH_STATUS_REC__", $texts.speech_status_rec).Replace("__SPEECH_STATUS_ERR__", $texts.speech_status_err).Replace("__SPEECH_STATUS_ERR_ALLOWED__", $texts.speech_status_err_allowed).Replace("__FEEDBACK_SPEECH_VERIFY_HANDWRITTEN__", $texts.feedback_speech_verify_handwritten).Replace("__FEEDBACK_SPEECH_VERIFY_HANDWRITTEN_SUFFIX__", $texts.feedback_speech_verify_handwritten_suffix).Replace("__FEEDBACK_SPEECH_VERIFY_STANDARD__", $texts.feedback_speech_verify_standard).Replace("__FEEDBACK_SPEECH_VERIFY_STANDARD_SUFFIX__", $texts.feedback_speech_verify_standard_suffix).Replace("__SPEECH_STATUS_SUCCESS__", $texts.speech_status_success).Replace("__SPEECH_STATUS_ERR_PRONOUNCE__", $texts.speech_status_err_pronounce).Replace("__SPEECH_STATUS_ERR_PRONOUNCE_MID__", $texts.speech_status_err_pronounce_mid).Replace("__SPEECH_STATUS_ERR_PRONOUNCE_SUFFIX__", $texts.speech_status_err_pronounce_suffix).Replace("__SPEECH_STATUS_ERR_PRONOUNCE_STATUS__", $texts.speech_status_err_pronounce_status).Replace("__SPEECH_STATUS_MISMATCH__", $texts.speech_status_mismatch).Replace("__SPEECH_STATUS_MISMATCH_MID__", $texts.speech_status_mismatch_mid).Replace("__SPEECH_STATUS_MISMATCH_SUFFIX__", $texts.speech_status_mismatch_suffix).Replace("__SPEECH_STATUS_MISMATCH_STATUS__", $texts.speech_status_mismatch_status)

# Regex match to replace from verifyArabicAns to nextQuestion
$verifyRegex = '(?s)function verifyArabicAns\(\)\s*\{.*?</script>'
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $verifyRegex, "$newVerifyLogic`r`n    </script>")

# 6. Replace HTML Body counts and sum labels
$content = $content.Replace('<div class="text-center text-[10px] font-bold text-red-500 pt-1">共 <span id="lbl-hundred-count">0</span> 個</div>', '<div class="text-center text-[10px] font-bold text-red-500 pt-1 hidden">共 <span id="lbl-hundred-count">0</span> 個</div>')
$content = $content.Replace('<div class="text-center text-[10px] font-bold text-amber-500 pt-1">共 <span id="lbl-ten-count">0</span> 個</div>', '<div class="text-center text-[10px] font-bold text-amber-500 pt-1 hidden">共 <span id="lbl-ten-count">0</span> 個</div>')
$content = $content.Replace('<div class="text-center text-[10px] font-bold text-yellow-500 pt-1">共 <span id="lbl-one-count">0</span> 個</div>', '<div class="text-center text-[10px] font-bold text-yellow-500 pt-1 hidden">共 <span id="lbl-one-count">0</span> 個</div>')
$content = $content.Replace('<div id="live-sum-display" class="mt-4 flex items-center justify-between bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-100">', '<div id="live-sum-display" class="mt-4 flex items-center justify-between bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-100 hidden">')

# 7. Clear button initial src properties in HTML
$content = [System.Text.RegularExpressions.Regex]::Replace($content, 'src="images/100元.jpg"', 'src=""')
$content = [System.Text.RegularExpressions.Regex]::Replace($content, 'src="images/10元.jpg"', 'src=""')
$content = [System.Text.RegularExpressions.Regex]::Replace($content, 'src="images/1元.jpg"', 'src=""')

$content = [System.Text.RegularExpressions.Regex]::Replace($content, "(window\.onload = \(\) => \{[\s\S]*?)initGame\(\);", "`$1initHandwritingCanvas();`n            setMode('coin');`n            initGame();")
$content = [System.Text.RegularExpressions.Regex]::Replace($content, "(function nextQuestion\(\) \{[\s\S]*?)initGame\(\);", "`$1initHandwritingCanvas();`n            setMode('coin');`n            initGame();")
$content = [System.Text.RegularExpressions.Regex]::Replace($content, "(function setMode\(newMode\) \{[\s\S]*?)initGame\(\);", "`$1updateShoppingProblemText();`n            initGame();")

# 9. Update HTML speech prompt
$content = $content.Replace('<p class="text-xs text-orange-700 font-bold mt-1">請按麥克風並念出數字（例如 147 要念成「一百四十七」，不可念一四七）</p>', "<p class=`"text-xs text-orange-700 font-bold mt-1`>$($texts.speech_prompt)</p>")

# 10. Update HTML speech status container to make it clickable
$oldSpeechStatus = @'
                    <div class="text-left">
                        <span class="text-xs font-bold text-stone-500 block">辨識狀態</span>
                        <span id="speech-status" class="text-sm font-black text-stone-700">點擊按鈕開始說話</span>
                    </div>
'@

$newSpeechStatus = @'
                    <div class="text-left cursor-pointer hover:underline" onclick="manualSpeechInput()">
                        <span class="text-xs font-bold text-stone-500 block">辨識狀態 (點此可手動輸入)</span>
                        <span id="speech-status" class="text-sm font-black text-stone-700">點擊按鈕開始說話</span>
                    </div>
'@

$content = $content.Replace($oldSpeechStatus, $newSpeechStatus)

# Save HTML file using UTF-8
[System.IO.File]::WriteAllText($htmlPath, $content, [System.Text.Encoding]::UTF8)

Write-Host "HTML file successfully updated!"

