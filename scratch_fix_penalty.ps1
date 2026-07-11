$dir = "C:\Users\User001\Documents\teachertsao"
$file = Get-ChildItem -Path $dir -Recurse -Filter "*.html" | Where-Object { $_.FullName -match "\u4e58\u6cd5\u5fc3\u81df\u75c5" } | Select-Object -First 1
$filePath = $file.FullName
Write-Output "Updating: $filePath"

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Normalize line endings to LF for regex matching simplicity
$content_norm = $content -replace "`r`n", "`n"

# Construct Chinese characters safely to avoid CP950 script translation bugs in PowerShell v2
$paiCuoLe = [regex]::Unescape("\u62cd\u932f\u4e86\uff01")  # "拍錯了！"

# 1. New hostExecuteSlap implementation
$newHostSlap = @'
const hostExecuteSlap = (slapPlayerIdx) => {
                if (punishingCard) return;
                const currentCardValue = flyingCard ? flyingCard.value : (centerPile.length > 0 ? centerPile[centerPile.length - 1].value : null);
                if (currentCardValue === null) return;
                const isMatch = currentCardValue === multiplier * currentStep;
                
                if (gameState === 'playing' && isMatch) {
                    if (isFlipResolvedRef.current) return;
                    isFlipResolvedRef.current = true;
                    
                    const card = flippedCardRef.current;
                    const newPile = [...centerPile, card];
                    
                    setCenterPile(newPile);
                    setFlyingCard(null);
                    setIsAnimating(false);
                    setGameState('slapping');
                    
                    setSlapResults([slapPlayerIdx]);
                    playSoundEffect('slap');
                    
                    broadcastStateUpdate({
                        players,
                        centerPile: newPile,
                        turn,
                        currentStep,
                        currentCall,
                        flyingCard: null,
                        gameState: 'slapping',
                        slapResults: [slapPlayerIdx],
                        isAnimating: false
                    });
                    return;
                }
                
                if (gameState === 'slapping') {
                    setSlapResults(prev => {
                        if (prev.includes(slapPlayerIdx)) return prev;
                        const newResults = [...prev, slapPlayerIdx];
                        playSoundEffect('slap');
                        
                        broadcastStateUpdate({
                            players,
                            centerPile,
                            turn,
                            currentStep,
                            currentCall,
                            flyingCard: null,
                            gameState: 'slapping',
                            slapResults: newResults
                        });

                        if (players[slapPlayerIdx].cards.length === 0 && newResults.length <= 3) {
                            setWinner(players[slapPlayerIdx]);
                            setGameState('gameOver');
                            broadcastGameOver(players[slapPlayerIdx]);
                            return newResults;
                        }

                        if (newResults.length === 3) {
                            const loserIndex = [0, 1, 2, 3].find(idx => !newResults.includes(idx));
                            
                            playSoundEffect('slap');
                            const punishing = { toPlayer: loserIndex, pileSnapshot: centerPile.slice(-8) };
                            setPunishingCard(punishing);
                            setCurrentCall(null);
                            
                            const nextSt = (difficulty === 'easy') ? (currentStep === 10 ? 1 : currentStep + 1) : (currentStep === 1 ? 10 : currentStep - 1);
                            
                            connections.forEach(c => {
                                c.send({
                                    type: 'penalty_update',
                                    punishingCard: punishing,
                                    players: players.map((p, idx) => idx === loserIndex ? { ...p, cards: [...centerPile, ...p.cards] } : p),
                                    centerPile: [],
                                    nextTurn: loserIndex,
                                    nextStep: nextSt
                                });
                            });

                            setTimeout(() => {
                                setPlayers(prevPlayers => {
                                    const newPlayers = [...prevPlayers];
                                    newPlayers[loserIndex] = {
                                        ...newPlayers[loserIndex],
                                        cards: [...centerPile, ...newPlayers[loserIndex].cards]
                                    };
                                    return newPlayers;
                                });
                                setCenterPile([]);
                                setSlapResults([]);
                                setPunishingCard(null);
                                setErrorMsg("");
                                setGameState('playing');
                                setTurn(loserIndex);
                                setCurrentStep(nextSt);
                                aiSlapScheduledRef.current = false;
                            }, 800);
                        }
                        return newResults;
                    });
                } else if (gameState === 'playing' && !isMatch) {
                    if (slapResults.length === 0) {
                        playSoundEffect('error');
                        setErrorMsg(`${players[slapPlayerIdx].name} {PAI_CUO_LE}`);
                        setSlapResults([slapPlayerIdx]);
                        
                        let activePile = centerPile;
                        if (!isFlipResolvedRef.current) {
                            isFlipResolvedRef.current = true;
                            const card = flippedCardRef.current;
                            activePile = [...centerPile, card];
                            setCenterPile(activePile);
                            setFlyingCard(null);
                            setIsAnimating(false);
                        }
                        
                        const punishing = { toPlayer: slapPlayerIdx, pileSnapshot: activePile.slice(-8) };
                        setPunishingCard(punishing);
                        setCurrentCall(null);
                        
                        const nextSt = (difficulty === 'easy') ? (currentStep === 10 ? 1 : currentStep + 1) : (currentStep === 1 ? 10 : currentStep - 1);

                        connections.forEach(c => {
                            c.send({
                                type: 'error_slap',
                                errorMsg: `${players[slapPlayerIdx].name} {PAI_CUO_LE}`,
                                slapPlayerIdx: slapPlayerIdx,
                                punishingCard: punishing,
                                players: players.map((p, idx) => idx === slapPlayerIdx ? { ...p, cards: [...activePile, ...p.cards] } : p),
                                centerPile: [],
                                nextTurn: slapPlayerIdx,
                                nextStep: nextSt
                            });
                        });

                        setTimeout(() => {
                            setPlayers(prevPlayers => {
                                const newPlayers = [...prevPlayers];
                                newPlayers[slapPlayerIdx] = {
                                    ...newPlayers[slapPlayerIdx],
                                    cards: [...activePile, ...newPlayers[slapPlayerIdx].cards]
                                };
                                return newPlayers;
                            });
                            setCenterPile([]);
                            setSlapResults([]);
                            setPunishingCard(null);
                            setErrorMsg("");
                            setGameState('playing');
                            setTurn(slapPlayerIdx);
                            setCurrentStep(nextSt);
                            aiSlapScheduledRef.current = false;
                        }, 800);
                    }
                }
            };
'@
$newHostSlap = $newHostSlap.Replace("{PAI_CUO_LE}", $paiCuoLe)
$newHostSlap_norm = $newHostSlap -replace "`r`n", "`n"

# 2. New executePenalty implementation
$newPenalty = @'
const executePenalty = (loserIndex, currentPile) => {
                if (punishingCard) return;
                playSoundEffect('slap');
                setPunishingCard({ toPlayer: loserIndex, pileSnapshot: currentPile.slice(-8) });
                setCurrentCall(null); 
                const nextStep = (difficulty === 'easy') ? (currentStep === 10 ? 1 : currentStep + 1) : (currentStep === 1 ? 10 : currentStep - 1);

                setTimeout(() => {
                    setPlayers(prevPlayers => {
                        const newPlayers = [...prevPlayers];
                        newPlayers[loserIndex] = {
                            ...newPlayers[loserIndex],
                            cards: [...currentPile, ...newPlayers[loserIndex].cards]
                        };
                        return newPlayers;
                    });
                    setCenterPile([]); setSlapResults([]); setPunishingCard(null); setErrorMsg(""); setGameState('playing');
                    setTurn(loserIndex); setCurrentStep(nextStep); aiSlapScheduledRef.current = false;
                }, 800);
            };
'@
$newPenalty_norm = $newPenalty -replace "`r`n", "`n"

# 3. New handleSlap implementation
$newHandleSlap = @'
const handleSlap = (playerIndex) => {
                if (punishingCard) return;
                const currentCardValue = flyingCard ? flyingCard.value : (centerPile.length > 0 ? centerPile[centerPile.length - 1].value : null);
                if (currentCardValue === null) return;
                const isMatch = currentCardValue === multiplier * currentStep;

                if (gameState === 'playing' && isMatch) {
                    if (isFlipResolvedRef.current) return;
                    isFlipResolvedRef.current = true;

                    const card = flippedCardRef.current;
                    const newPile = [...centerPile, card];
                    setCenterPile(newPile);
                    setFlyingCard(null);
                    setIsAnimating(false);
                    setGameState('slapping');

                    setSlapResults([playerIndex]);
                    playSoundEffect('slap');

                    if (players[playerIndex].cards.length === 0) {
                        setWinner(players[playerIndex]);
                        setGameState('gameOver');
                    }
                    return;
                }

                if (gameState === 'slapping') {
                    setSlapResults(prev => {
                        if (prev.includes(playerIndex)) return prev;
                        const newResults = [...prev, playerIndex];
                        playSoundEffect('slap');

                        if (players[playerIndex].cards.length === 0 && newResults.length <= 3) {
                            setWinner(players[playerIndex]);
                            setGameState('gameOver');
                            return newResults;
                        }

                        if (newResults.length === 3) {
                            const loserIndex = [0, 1, 2, 3].find(idx => !newResults.includes(idx));
                            executePenalty(loserIndex, centerPile);
                        }
                        return newResults;
                    });
                } else if (gameState === 'playing' && !isMatch) {
                    if (slapResults.length === 0) {
                        playSoundEffect('error'); 
                        setErrorMsg(`${players[playerIndex].name} {PAI_CUO_LE}`); 
                        setSlapResults([playerIndex]); 

                        let activePile = centerPile;
                        if (!isFlipResolvedRef.current) {
                            isFlipResolvedRef.current = true;
                            const card = flippedCardRef.current;
                            activePile = [...centerPile, card];
                            setCenterPile(activePile);
                            setFlyingCard(null);
                            setIsAnimating(false);
                        }

                        executePenalty(playerIndex, activePile);
                    }
                }
            };
'@
$newHandleSlap = $newHandleSlap.Replace("{PAI_CUO_LE}", $paiCuoLe)
$newHandleSlap_norm = $newHandleSlap -replace "`r`n", "`n"

# Regex patterns for replacement
$hostRegex = "(?s)const hostExecuteSlap = \(slapPlayerIdx\) => \{.*?\n            \};"
$penaltyRegex = "(?s)const executePenalty = \(loserIndex\) => \{.*?\n            \};"
$handleRegex = "(?s)const handleSlap = \(playerIndex\) => \{.*?\n            \};"

if ([System.Text.RegularExpressions.Regex]::IsMatch($content_norm, $hostRegex) -and 
    [System.Text.RegularExpressions.Regex]::IsMatch($content_norm, $penaltyRegex) -and 
    [System.Text.RegularExpressions.Regex]::IsMatch($content_norm, $handleRegex)) {
    
    $content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $hostRegex, $newHostSlap_norm)
    $content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $penaltyRegex, $newPenalty_norm)
    $content_norm = [System.Text.RegularExpressions.Regex]::Replace($content_norm, $handleRegex, $newHandleSlap_norm)
    
    $content_crlf = $content_norm -replace "`n", "`r`n"
    [System.IO.File]::WriteAllText($filePath, $content_crlf, [System.Text.Encoding]::UTF8)
    Write-Output "Successfully fixed the penalty state staleness bugs!"
} else {
    Write-Output "Could not match all functions using regex!"
}
