$dir = "C:\Users\User001\Documents\teachertsao"
$file = Get-ChildItem -Path $dir -Recurse -Filter "*.html" | Where-Object { $_.FullName -match "\u4e58\u6cd5\u5fc3\u81df\u75c5" } | Select-Object -First 1
$filePath = $file.FullName
Write-Output "Updating: $filePath"

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Replace Cyrillic Т (\u0422) with normal English T globally to avoid homoglyph compile/encoding bugs
$content = [System.Text.RegularExpressions.Regex]::Replace($content, "advanceOnline\u0422urn", "advanceOnlineTurn")

# Normalize line endings to LF for regex matching simplicity
$content_norm = $content -replace "`r`n", "`n"

# Define new hostExecutePlayTurn block using normal English T
$newHostPlayTurn = @'
const hostExecutePlayTurn = () => {
                if (gameState !== 'playing' || isAnimating || punishingCard) return;

                const playersWithCards = players.filter(p => p.cards.length > 0);
                if (playersWithCards.length === 0) {
                    setGameState('gameOver');
                    setWinner(null);
                    broadcastGameOver(null);
                    return;
                }
                
                if (players[turn].cards.length === 0) {
                    const next = findNextPlayerWithCards(turn);
                    if (next !== null) {
                        setTurn(next);
                        broadcastStateUpdate({
                            players,
                            centerPile,
                            turn: next,
                            currentStep,
                            currentCall,
                            flyingCard: null,
                            gameState: 'playing'
                        });
                    }
                    return;
                }

                playSoundEffect('flip');
                setIsAnimating(true);
                setShowIdleHint(false);
                
                const newPlayers = [...players];
                const card = newPlayers[turn].cards.pop();
                flippedCardRef.current = card;
                isFlipResolvedRef.current = false;
                const callValue = multiplier * currentStep;
                
                const newCall = { playerIdx: turn, text: `${multiplier} \u00d7 ${currentStep} = ${callValue}` };
                const newFlying = { value: card.value, fromPlayer: turn };
                
                setCurrentCall(newCall);
                setFlyingCard(newFlying);
                
                broadcastStateUpdate({
                    players: newPlayers,
                    centerPile,
                    turn,
                    currentStep,
                    currentCall: newCall,
                    flyingCard: newFlying,
                    gameState: 'playing',
                    isAnimating: true
                });

                setTimeout(() => {
                    const advanceOnlineTurn = () => {
                        if (isFlipResolvedRef.current) return;
                        isFlipResolvedRef.current = true;
                        const newPile = [...centerPile, card];
                        setCenterPile(newPile);
                        setFlyingCard(null);
                        setPlayers(newPlayers);
                        setIsAnimating(false);
                        
                        if (card.value === callValue) {
                            setGameState('slapping');
                            aiSlapScheduledRef.current = false;
                            
                            broadcastStateUpdate({
                                players: newPlayers,
                                centerPile: newPile,
                                turn,
                                currentStep,
                                currentCall: newCall,
                                flyingCard: null,
                                gameState: 'slapping',
                                slapResults: [],
                                isAnimating: false
                            });
                        } else {
                            players.forEach((p, idx) => {
                                if (p.isAI) {
                                    if (isDangerousPair(card.value, callValue)) {
                                        const chance = aiLevel === 'easy' ? 0.5 : aiLevel === 'normal' ? 0.3 : 0.1;
                                        if (Math.random() < chance) {
                                            const delay = (Math.random() * 500 + 300) * getAiSlapMultiplier();
                                            setTimeout(() => {
                                                setGameState(curr => { if (curr === 'slapping') hostExecuteSlap(idx); return curr; });
                                            }, delay);
                                        }
                                    }
                                }
                            });

                            const next = findNextPlayerWithCards(turn);
                            if (next !== null) {
                                setTurn(next);
                                const nextSt = (difficulty === 'easy') ? (currentStep === 10 ? 1 : currentStep + 1) : (currentStep === 1 ? 10 : currentStep - 1);
                                setCurrentStep(nextSt);
                                
                                broadcastStateUpdate({
                                    players: newPlayers,
                                    centerPile: newPile,
                                    turn: next,
                                    currentStep: nextSt,
                                    currentCall: null,
                                    flyingCard: null,
                                    gameState: 'playing',
                                    isAnimating: false
                                });
                            } else {
                                setGameState('gameOver');
                                setWinner(null);
                                broadcastGameOver(null);
                            }
                        }
                    };
                    // Wait for speech to finish before advancing turn
                    const speechDone = window.currentSpeechPromise || Promise.resolve();
                    speechDone.then(advanceOnlineTurn);
                }, 600);
            };
'@
$newHostPlayTurn_norm = $newHostPlayTurn -replace "`r`n", "`n"

# Define new playTurn block
$newPlayTurn = @'
const playTurn = (isManual = false) => {
                if (gameState !== 'playing' || isAnimating || punishingCard) return;
                if (isManual && turn !== 0) return; 

                const playersWithCards = players.filter(p => p.cards.length > 0);
                if (playersWithCards.length === 0) { setGameState('gameOver'); setWinner(null); return; }
                
                if (players[turn].cards.length === 0) {
                    const next = findNextPlayerWithCards(turn);
                    if (next !== null) setTurn(next);
                    return;
                }

                playSoundEffect('flip');
                setIsAnimating(true); setShowIdleHint(false); 
                const newPlayers = [...players];
                const card = newPlayers[turn].cards.pop();
                flippedCardRef.current = card;
                isFlipResolvedRef.current = false;
                const callValue = multiplier * currentStep;
                
                setCurrentCall({ playerIdx: turn, text: `${multiplier} \u00d7 ${currentStep} = ${callValue}` });
                setFlyingCard({ value: card.value, fromPlayer: turn });

                // Wait for the card animation (600ms) AND for any ongoing speech to finish
                const advanceTurn = () => {
                    if (isFlipResolvedRef.current) return;
                    isFlipResolvedRef.current = true;
                    const newPile = [...centerPile, card];
                    setCenterPile(newPile); setFlyingCard(null); setPlayers(newPlayers);
                    
                    if (card.value === callValue) {
                        setGameState('slapping'); aiSlapScheduledRef.current = false; setIsAnimating(false);
                    } else {
                        players.forEach((p, idx) => {
                            if (p.isAI) {
                                if (isDangerousPair(card.value, callValue)) {
                                    const chance = aiLevel === 'easy' ? 0.5 : aiLevel === 'normal' ? 0.3 : 0.1;
                                    if (Math.random() < chance) setTimeout(() => handleSlap(idx), (Math.random() * 500 + 300) * getAiSlapMultiplier());
                                }
                            }
                        });

                        const next = findNextPlayerWithCards(turn);
                        if (next !== null) {
                            setTurn(next);
                            if (difficulty === 'easy') setCurrentStep(currentStep === 10 ? 1 : currentStep + 1);
                            else setCurrentStep(currentStep === 1 ? 10 : currentStep - 1);
                        } else { setGameState('gameOver'); setWinner(null); }
                        setIsAnimating(false);
                    }
                };

                setTimeout(() => {
                    const speechDone = window.currentSpeechPromise || Promise.resolve();
                    speechDone.then(advanceTurn);
                }, 600);
            };
'@
$newPlayTurn_norm = $newPlayTurn -replace "`r`n", "`n"

# Regex patterns for replacement
$hostRegex = "(?s)const hostExecutePlayTurn = \(\) => \{.*?\n            \};"
$playRegex = "(?s)const playTurn = \(isManual = false\) => \{.*?\n            \};"

if ([System.Text.RegularExpressions.Regex]::IsMatch($content_norm, $hostRegex) -and 
    [System.Text.RegularExpressions.Regex]::IsMatch($content_norm, $playRegex)) {
    
    $content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $hostRegex, $newHostPlayTurn_norm)
    $content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $playRegex, $newPlayTurn_norm)
    
    $content_crlf = $content_norm -replace "`n", "`r`n"
    [System.IO.File]::WriteAllText($filePath, $content_crlf, [System.Text.Encoding]::UTF8)
    Write-Output "Successfully updated hostExecutePlayTurn and playTurn with normal English T!"
} else {
    Write-Output "Could not match play turn functions using regex!"
}
