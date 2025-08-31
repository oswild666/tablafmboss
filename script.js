// Аудиоконтекст
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();

        // Элементы управления
        const tempoSlider = document.getElementById('tempo');
        const tempoValue = document.getElementById('tempo-value');
        const volumeSlider = document.getElementById('volume');
        const volumeValue = document.getElementById('volume-value');
        const breakFrequencySlider = document.getElementById('break-frequency');
        const breakFrequencyValue = document.getElementById('break-frequency-value');
        const complexitySlider = document.getElementById('complexity');
        const complexityValue = document.getElementById('complexity-value');
        const taalSelect = document.getElementById('taal-select');
        const breakTypeSelect = document.getElementById('break-type');
        const modeSelect = document.getElementById('mode-select');
        const playBtn = document.getElementById('play-btn');
        const generateBtn = document.getElementById('generate-btn');
        const rhythmGrid = document.getElementById('rhythm-grid');
        const taalInfo = document.getElementById('taal-info');
        const visualizer = document.getElementById('visualizer');

        // FM Settings Elements
        const soundSelector = document.getElementById('sound-selector');
        const pitchSlider = document.getElementById('pitch-slider');
        const modDepthSlider = document.getElementById('mod-depth-slider');
        const soundVolumeSlider = document.getElementById('sound-volume-slider');
        const pitchValue = document.getElementById('pitch-value');
        const modDepthValue = document.getElementById('mod-depth-value');
        const soundVolumeValue = document.getElementById('sound-volume-value');

        // Глобальные переменные
        let isPlaying = false;
        let rhythmSchedulerFunction;
        let nextNoteTime = 0;
        let currentStep = 0;
        let currentPattern = [];
        let currentTaal = 'teental';
        let tempo = 140;
        let masterVolume = 0.7;
        let complexity = 7;
        let breakFrequency = 25;
        let breakType = 'mixed';
        let animationFrame;
        let currentSoundIndex = 0;
        let analyser;
        let dataArray;
        let cycleCount = 0;
        let currentMode = 'normal';

        // Настройки FM для каждого звука
        const soundSettings = [
            { pitch: 120, modDepth: 80, volume: 0.7 },  // Dha
            { pitch: 150, modDepth: 100, volume: 0.6 }, // Dhin
            { pitch: 300, modDepth: 200, volume: 0.5 }, // Ta
            { pitch: 350, modDepth: 250, volume: 0.5 }, // Tin
            { pitch: 250, modDepth: 180, volume: 0.4 }, // Na
            { pitch: 400, modDepth: 300, volume: 0.4 }, // Tirkita
            { pitch: 200, modDepth: 150, volume: 0.5 }, // Kat
            { pitch: 180, modDepth: 120, volume: 0.5 }  // Ge
        ];

        // Создание визуализатора
        function createVisualizer() {
            visualizer.innerHTML = '';
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            for (let i = 0; i < bufferLength; i++) {
                const bar = document.createElement('div');
                bar.className = 'bar';
                bar.style.height = '5px';
                visualizer.appendChild(bar);
            }
        }

        // Обновление визуализатора
        function updateVisualizer() {
            if (!analyser) return;

            analyser.getByteFrequencyData(dataArray);
            const bars = document.querySelectorAll('.bar');
            const bufferLength = analyser.frequencyBinCount;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] / 2.5;
                bars[i].style.height = `${Math.max(5, barHeight)}px`;
            }

            // Анимация визуализатора
            if (isPlaying) {
                animationFrame = requestAnimationFrame(updateVisualizer);
            }
        }

        // Информация о таалах
        const taalInfoText = {
            teental: "Теентал - самый популярный таал в индийской классической музыке, состоящий из 16 матров (ударов), разделенных на 4 вибхага (части) по 4 матра. Позиция 'Сам' (начало цикла) обозначена красным цветом.",
            jhaptal: "Джхаптал - асимметричный таал из 10 матров, разделенный на 4 вибхага: 2+3+2+3. Позиция 'Кхали' (пустой удар) обозначена синим цветом.",
            ektal: "Эктал - цикл из 12 матров, разделенный на 6 вибхага по 2 матра. Имеет сложную структуру с несколькими позициями 'Кхали'.",
            rupak: "Рупак - короткий таал из 7 матров, часто используемый в классической музыке. Его структура: 3+2+2.",
            deepchandi: "Дипчанди - сложный таал из 14 матров, разделенный на 3+4+3+4. Используется для создания напряженной атмосферы.",
            jhumra: "Джхумра - таал из 14 матров с делением 2+3+2+3+2+2. Часто используется в медитативной музыке."
        };

        // Новые ритмические сбивки
        const breakPatterns = {
            zalzala: {
                name: "Зелзела",
                formula: [0, 7, 5, 7, 0], // | धा गे तिरकिट गे धा |
                rule: "5-ударный взрыв на 9-м ударе, смещение на 3/8"
            },
            phislana: {
                name: "ФИСЛАНА",
                formula: [3, 4, 5, 1, 1, 2, 0], // | टिन ना तिरकिट धिन धिन टा धा |
                rule: "7-ударная фраза на 11-м ударе, каждый удар на 25% короче"
            },
            mrigchala: {
                name: "Мригчала",
                formula: [6, 3, 4], // | (soft) कत टिन ना |
                rule: "Тихая микрофраза 3+2+2 на 14-м ударе"
            },
            visphotak: {
                name: "Виспхотак",
                formula: [1, 1, 0, 1, 1, 0, 1, 1, 0], // | धिन धिन धा | धिन धिन धा | धिन धин धा |
                rule: "9-ударная полиритмия 3:3:3 вместо финального 'धा' каждые 4 цикла"
            }
        };

        // Определение таалов
        const taals = {
            teental: {
                name: "Теентал",
                matras: 16,
                vibhag: [4, 4, 4, 4],
                sam: [0],
                khali: [4, 8, 12]
            },
            jhaptal: {
                name: "Джхаптал",
                matras: 10,
                vibhag: [2, 3, 2, 3],
                sam: [0],
                khali: [2, 5, 7]
            },
            ektal: {
                name: "Эктал",
                matras: 12,
                vibhag: [2, 2, 2, 2, 2, 2],
                sam: [0],
                khali: [2, 4, 6, 8, 10]
            },
            rupak: {
                name: "Рупак",
                matras: 7,
                vibhag: [3, 2, 2],
                sam: [0],
                khali: [3, 5]
            },
            deepchandi: {
                name: "Дипчанди",
                matras: 14,
                vibhag: [3, 4, 3, 4],
                sam: [0],
                khali: [3, 7, 10]
            },
            jhumra: {
                name: "Джхумра",
                matras: 14,
                vibhag: [2, 3, 2, 3, 2, 2],
                sam: [0],
                khali: [2, 5, 7, 10, 12]
            }
        };

        // Создание FM-перкуссии
        function playSound(soundIndex, time, isBreak = false, volumeMultiplier = 1.0) {
            const settings = soundSettings[soundIndex];

            // Для сбивок уменьшаем длительность
            const decay = isBreak ? 0.05 : 0.2;

            // Несущий осциллятор
            const carrier = audioCtx.createOscillator();
            carrier.type = 'sine';
            carrier.frequency.value = settings.pitch;

            // Модулирующий осциллятор
            const modulator = audioCtx.createOscillator();
            modulator.type = 'sine';
            modulator.frequency.value = settings.pitch * 0.7;

            // Узел усиления для модуляции
            const modulationGain = audioCtx.createGain();
            modulationGain.gain.value = settings.modDepth;

            // Узел огибающей
            const envelope = audioCtx.createGain();
            envelope.gain.setValueAtTime(0, time);
            envelope.gain.linearRampToValueAtTime(settings.volume * masterVolume * volumeMultiplier, time + 0.001);
            envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.001 + decay);

            // Соединения
            modulator.connect(modulationGain);
            modulationGain.connect(carrier.frequency);
            carrier.connect(envelope);
            envelope.connect(analyser);
            analyser.connect(audioCtx.destination);

            // Запуск и остановка
            carrier.start(time);
            modulator.start(time);
            carrier.stop(time + 0.001 + decay);
            modulator.stop(time + 0.001 + decay);
        }

        // Создание различных типов сбивок
        function playBreak(time, duration, breakType, soundIndex, currentStep) {
            let numNotes, noteDuration;
            const secondsPerBeat = 60.0 / tempo;

            const breakPattern = breakPatterns[breakType];
            if (breakPattern) {
                const formula = breakPattern.formula;
                numNotes = formula.length;

                if (breakType === 'zalzala' && currentStep !== 8) return;
                if (breakType === 'phislana' && currentStep !== 10) return;
                if (breakType === 'mrigchala' && currentStep !== 13) return;
                if (breakType === 'visphotak' && (cycleCount % 4 !== 0 || currentStep !== taals[currentTaal].matras - 1)) return;


                let noteSpacing = duration / numNotes;
                if (breakType === 'phislana') {
                    noteSpacing *= 0.75;
                } else if (breakType === 'zalzala') {
                    noteSpacing = (3 / 8 * secondsPerBeat) / 5;
                } else if (breakType === 'visphotak') {
                    // 3 triplets over 2 beats
                    noteSpacing = (2 * secondsPerBeat) / 9;
                }

                for (let i = 0; i < numNotes; i++) {
                    const noteTime = time + i * noteSpacing;
                    const volumeMultiplier = breakType === 'mrigchala' ? 0.3 : 1.0;
                    playSound(formula[i], noteTime, true, volumeMultiplier);
                }
                return;
            }

            switch(breakType) {
                case 'triplets':
                    numNotes = 3;
                    noteDuration = duration / numNotes;
                    break;
                case 'fast':
                    numNotes = Math.max(4, Math.floor(duration * tempo / 15));
                    noteDuration = duration / numNotes;
                    break;
                case 'superfast':
                    numNotes = Math.max(8, Math.floor(duration * tempo / 7));
                    noteDuration = duration / numNotes;
                    break;
                case 'ultrafast':
                    numNotes = Math.max(16, Math.floor(duration * tempo / 3));
                    noteDuration = duration / numNotes;
                    break;
                default: // mixed
                    const types = ['triplets', 'fast', 'superfast', 'ultrafast'];
                    const randomType = types[Math.floor(Math.random() * types.length)];
                    playBreak(time, duration, randomType, soundIndex, currentStep);
                    return;
            }

            for (let i = 0; i < numNotes; i++) {
                const noteTime = time + i * noteDuration;
                playSound(soundIndex, noteTime, true);
            }
        }

        // Создание ритмического паттерна
        function generatePattern() {
            const taal = taals[currentTaal];
            const pattern = [];

            // Базовые позиции ударов
            for (let i = 0; i < taal.matras; i++) {
                let sound = null;
                let breakInfo = null;

                // Сам (начало цикла)
                if (taal.sam.includes(i)) {
                    sound = 0; // Dha
                }
                // Кхали (пустые удары)
                else if (taal.khali.includes(i)) {
                    if (Math.random() > 0.3) sound = 4; // Na
                }
                // Остальные позиции
                else {
                    // Сложность определяет плотность ударов
                    const density = 0.4 + (complexity / 10) * 0.6;
                    if (Math.random() < density) {
                        // Выбор звука в зависимости от позиции
                        if (i % 4 === 0) {
                            sound = Math.random() > 0.6 ? 1 : 0; // Dhin или Dha
                        } else if (i % 2 === 0) {
                            sound = Math.floor(Math.random() * 3) + 2; // Ta, Tin или Na
                        } else {
                            sound = Math.floor(Math.random() * 5) + 3; // Tin, Na, Tirkita, Kat или Ge
                        }
                    }
                }

                // Добавление сбивок
                if (sound !== null && Math.random() * 100 < breakFrequency) {
                    let availableBreaks = ['triplets', 'fast', 'superfast', 'ultrafast'];
                    if (i === 8 && currentTaal === 'teental') availableBreaks.push('zalzala');
                    if (i === 10 && currentTaal === 'teental') availableBreaks.push('phislana');
                    if (i === 13 && currentTaal === 'teental') availableBreaks.push('mrigchala');

                    let type;
                    if (breakType === 'mixed') {
                        type = availableBreaks[Math.floor(Math.random() * availableBreaks.length)];
                    } else {
                        if (availableBreaks.includes(breakType)) {
                            type = breakType;
                        }
                    }

                    if (type) {
                        breakInfo = {
                            type: type,
                            duration: 0.5 + Math.random() * 0.5,
                            soundIndex: sound
                        };
                    }
                }

                pattern.push({
                    sound: sound,
                    break: breakInfo
                });
            }

            // Добавление тихай (повторяющейся фразы в конце)
            if (complexity > 6) {
                const phraseLength = Math.min(3, Math.floor(taal.matras / 4));
                const repeatStart = taal.matras - phraseLength * 3;

                if (repeatStart > 0) {
                    for (let i = 0; i < phraseLength; i++) {
                        const sourceIndex = repeatStart + i;
                        if (sourceIndex < taal.matras) {
                            const source = pattern[sourceIndex];
                            if (source.sound !== null) {
                                pattern[repeatStart + phraseLength + i] = {...source};
                                pattern[repeatStart + phraseLength * 2 + i] = {...source};
                            }
                        }
                    }
                }
            }

            return pattern;
        }

        // Отображение паттерна
        function displayPattern(pattern) {
            const taal = taals[currentTaal];
            rhythmGrid.innerHTML = '';
            rhythmGrid.style.gridTemplateColumns = `repeat(${taal.matras}, 1fr)`;

            pattern.forEach((item, index) => {
                const cell = document.createElement('div');
                cell.className = 'rhythm-cell';

                if (item.sound !== null) {
                    cell.textContent = getSoundSymbol(item.sound);
                    cell.classList.add('active');

                    if (item.break) {
                        // Добавляем визуальные индикаторы для разных типов сбивок
                        cell.classList.add(item.break.type);
                        switch(item.break.type) {
                            case 'triplets':
                                cell.innerHTML += '<div class="triplet-badge">3</div>';
                                break;
                            case 'superfast':
                                cell.innerHTML += '<div class="super-fast-badge">32</div>';
                                break;
                            case 'ultrafast':
                                cell.innerHTML += '<div class="super-fast-badge">64</div>';
                                break;
                        }
                    }
                }

                if (taal.sam.includes(index)) {
                    cell.classList.add('sam');
                } else if (taal.khali.includes(index)) {
                    cell.classList.add('khali');
                }

                rhythmGrid.appendChild(cell);
            });
        }

        // Получение символа звука
        function getSoundSymbol(soundIndex) {
            const symbols = ['धा', 'धिन', 'टा', 'टिन', 'ना', 'तिरकिट', 'कत', 'गे'];
            return symbols[soundIndex];
        }

        // Планировщик ритма
        function rhythmScheduler() {
            if (!isPlaying) return;

            // Время следующего шага
            const currentTime = audioCtx.currentTime;
            const secondsPerBeat = 60.0 / tempo;

            // Планируем звуки на ближайшие 100 мс
            while (nextNoteTime < currentTime + 0.1) {
                const pattern = currentPattern;
                const taal = taals[currentTaal];

                if (currentStep === 0) {
                    cycleCount++;
                }

                let stepToPlay = currentStep;
                if (currentMode === 'chakrabhram' && cycleCount % 2 === 0) {
                    stepToPlay = taal.matras - 1 - currentStep;
                }

                // Проигрываем звук, если он есть
                const currentItem = pattern[stepToPlay];

                if (cycleCount > 0 && cycleCount % 4 === 0 && currentStep === taal.matras - 1) {
                    playBreak(nextNoteTime, secondsPerBeat * 2, 'visphotak', 0, currentStep);
                } else {
                    if (currentItem.sound !== null) {
                        if (currentItem.break) {
                            // Проигрываем сбивку
                            const duration = secondsPerBeat * currentItem.break.duration;
                            playBreak(nextNoteTime, duration, currentItem.break.type, currentItem.break.soundIndex, stepToPlay);
                        } else {
                            // Обычный звук
                            playSound(currentItem.sound, nextNoteTime);
                        }
                    }
                }

                // Обновляем визуализацию
                const cells = document.querySelectorAll('.rhythm-cell');
                cells.forEach((cell, index) => {
                    cell.style.opacity = index === currentStep ? '1' : '0.7';
                });

                // Переход к следующему шагу
                currentStep = (currentStep + 1) % taal.matras;
                nextNoteTime += secondsPerBeat;
            }

            // Повторяем планирование
            setTimeout(rhythmScheduler, 50);
        }

        // Начало/остановка воспроизведения
        function togglePlayback() {
            if (isPlaying) {
                isPlaying = false;
                playBtn.textContent = 'Воспроизвести ритм';
                document.querySelectorAll('.rhythm-cell').forEach(cell => {
                    cell.style.opacity = '1';
                });
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
            } else {
                isPlaying = true;
                playBtn.textContent = 'Остановить ритм';
                nextNoteTime = audioCtx.currentTime;
                currentStep = 0;
                rhythmScheduler();
                updateVisualizer();
            }
        }

        // Обновление FM-настроек в UI
        function updateFMSettingsUI() {
            const settings = soundSettings[currentSoundIndex];
            pitchSlider.value = settings.pitch;
            modDepthSlider.value = settings.modDepth;
            soundVolumeSlider.value = settings.volume;

            pitchValue.textContent = settings.pitch;
            modDepthValue.textContent = settings.modDepth;
            soundVolumeValue.textContent = Math.round(settings.volume * 100) + '%';
        }

        // Инициализация
        function init() {
            // Создание визуализатора
            createVisualizer();

            // Обработчики событий для слайдеров
            tempoSlider.addEventListener('input', () => {
                tempo = parseInt(tempoSlider.value);
                tempoValue.textContent = tempo;
            });

            volumeSlider.addEventListener('input', () => {
                masterVolume = parseFloat(volumeSlider.value);
                volumeValue.textContent = Math.round(masterVolume * 100) + '%';
            });

            breakFrequencySlider.addEventListener('input', () => {
                breakFrequency = parseInt(breakFrequencySlider.value);
                breakFrequencyValue.textContent = breakFrequency + '%';
            });

            complexitySlider.addEventListener('input', () => {
                complexity = parseInt(complexitySlider.value);
                const levels = ['Очень низкая', 'Низкая', 'Ниже среднего', 'Средняя', 'Выше среднего', 'Высокая', 'Очень высокая'];
                complexityValue.textContent = levels[Math.min(6, Math.floor(complexity / 1.5))];
            });

            taalSelect.addEventListener('change', () => {
                currentTaal = taalSelect.value;
                taalInfo.textContent = taalInfoText[currentTaal];
                generatePatternAndDisplay();
            });

            breakTypeSelect.addEventListener('change', () => {
                breakType = breakTypeSelect.value;
                generatePatternAndDisplay();
            });

            modeSelect.addEventListener('change', () => {
                currentMode = modeSelect.value;
            });

            playBtn.addEventListener('click', togglePlayback);

            generateBtn.addEventListener('click', generatePatternAndDisplay);

            // Обработчики для звуковых панелей
            document.querySelectorAll('.sound-pad').forEach(pad => {
                pad.addEventListener('click', () => {
                    const soundIndex = parseInt(pad.getAttribute('data-sound'));
                    playSound(soundIndex, audioCtx.currentTime);
                    pad.classList.add('active');
                    setTimeout(() => pad.classList.remove('active'), 200);
                });
            });

            // Обработчики для селектора звуков
            document.querySelectorAll('.sound-selector-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    // Убираем активный класс у всех кнопок
                    document.querySelectorAll('.sound-selector-btn').forEach(b => {
                        b.classList.remove('active');
                    });

                    // Добавляем активный класс к текущей кнопке
                    btn.classList.add('active');

                    // Обновляем текущий звук
                    currentSoundIndex = parseInt(btn.getAttribute('data-sound'));

                    // Обновляем UI настроек
                    updateFMSettingsUI();
                });
            });

            // Обработчики для FM-параметров
            pitchSlider.addEventListener('input', () => {
                soundSettings[currentSoundIndex].pitch = parseInt(pitchSlider.value);
                pitchValue.textContent = pitchSlider.value;
            });

            modDepthSlider.addEventListener('input', () => {
                soundSettings[currentSoundIndex].modDepth = parseInt(modDepthSlider.value);
                modDepthValue.textContent = modDepthSlider.value;
            });

            soundVolumeSlider.addEventListener('input', () => {
                soundSettings[currentSoundIndex].volume = parseFloat(soundVolumeSlider.value);
                soundVolumeValue.textContent = Math.round(soundVolumeSlider.value * 100) + '%';
            });

            // Инициализация первого паттерна
            generatePatternAndDisplay();

            // Инициализация FM-настроек
            updateFMSettingsUI();
        }

        // Генерация и отображение паттерна
        function generatePatternAndDisplay() {
            currentPattern = generatePattern();
            displayPattern(currentPattern);
        }

        // Запуск при загрузке
        window.addEventListener('load', init);
