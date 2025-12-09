import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSpeechSynthesis } from 'react-speech-kit';
import { FiVolume2, FiPause, FiSquare, FiPlay } from "react-icons/fi";
import { RiListSettingsFill } from "react-icons/ri";

const VOICEKEY = process.env.REACT_APP_VOICECONTROLVALUE;

const TextToSpeechControls = ({ text, chatId, onStop, disabled = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedVoiceType, setSelectedVoiceType] = useState('');
  const [playbackRate, setPlaybackRate] = useState(0);
  const [textSpeechSettingFlag, setTextSpeechSettingFlag] = useState(false);

  const { speak, cancel, speaking, supported, voices } = useSpeechSynthesis();

  // Get available English voices and categorize them
  const englishVoices = voices.filter(voice =>
    voice.lang.includes('en')
  );

  // Categorize voices by gender (based on voice name patterns)
  const categorizeVoices = (voices) => {
    const femaleVoices = voices.filter(voice =>
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('samantha') ||
      voice.name.toLowerCase().includes('karen') ||
      voice.name.toLowerCase().includes('tessa') ||
      voice.name.toLowerCase().includes('veena') ||
      voice.name.toLowerCase().includes('lekha')
    );

    const maleVoices = voices.filter(voice =>
      voice.name.toLowerCase().includes('male') ||
      voice.name.toLowerCase().includes('man') ||
      voice.name.toLowerCase().includes('alex') ||
      voice.name.toLowerCase().includes('daniel') ||
      voice.name.toLowerCase().includes('fred') ||
      voice.name.toLowerCase().includes('ravi') ||
      voice.name.toLowerCase().includes('google uk male') ||
      voice.name.toLowerCase().includes('microsoft david') ||
      (voice.name.toLowerCase().includes('english') && !femaleVoices.includes(voice))
    );

    // For voices that couldn't be categorized, put them in both for now
    const uncategorized = voices.filter(voice =>
      !femaleVoices.includes(voice) && !maleVoices.includes(voice)
    );

    return {
      female: [...femaleVoices, ...uncategorized],
      male: [...maleVoices, ...uncategorized]
    };
  };

  const categorizedVoices = categorizeVoices(englishVoices);
  const availableVoices = categorizedVoices[selectedVoiceType] || englishVoices;

  // Get preferred voice based on selected language and type
  const getPreferredVoice = () => {
    // First try to find a voice matching the selected language and type
    const preferredVoices = availableVoices.filter(voice =>
      voice.lang.includes(selectedLanguage)
    );

    if (preferredVoices.length > 0) {
      return preferredVoices[0];
    }

    // Fallback to any available voice of selected type
    if (availableVoices.length > 0) {
      return availableVoices[0];
    }

    // Final fallback to any English voice
    const defaultEnglish = englishVoices.find(voice => voice.default) || englishVoices[0];
    return defaultEnglish;
  };

  const voice = getPreferredVoice();

  const handlePlay = () => {
    if (disabled) return; // Disable if summary is not fully generated
    
    if (speaking && isPaused) {
      // Resume if paused
      speak({ text: text, voice, rate: playbackRate });
      setIsPaused(false);
    } else if (!speaking) {
      // Start new speech with selected voice and rate
      speak({
        text: text,
        voice,
        rate: playbackRate,
        pitch: selectedVoiceType === 'female' ? 1.1 : 0.9,
        volume: 1
      });
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    if (speaking) {
      cancel();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    cancel();
    setIsPlaying(false);
    setIsPaused(false);
    onStop?.();
  };

  const handleLanguageChange = (e) => {
    if (disabled) return; // Disable if summary is not fully generated
    
    setSelectedLanguage(e.target.value);
    const currentSetting = JSON.parse(localStorage.getItem(VOICEKEY));
    localStorage.setItem(VOICEKEY, JSON.stringify({ ...currentSetting, lang_accent: e.target.value }))
    if (speaking) {
      cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleVoiceTypeChange = (e) => {
    if (disabled) return; // Disable if summary is not fully generated
    
    setSelectedVoiceType(e.target.value);
    const currentSetting = JSON.parse(localStorage.getItem(VOICEKEY));
    localStorage.setItem(VOICEKEY, JSON.stringify({ ...currentSetting, gender: e.target.value }))
    if (speaking) {
      cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handlePlaybackRateChange = (e) => {
    if (disabled) return; // Disable if summary is not fully generated
    
    setPlaybackRate(parseFloat(e.target.value));
    const currentSetting = JSON.parse(localStorage.getItem(VOICEKEY));
    localStorage.setItem(VOICEKEY, JSON.stringify({ ...currentSetting, speed: parseFloat(e.target.value) }))
    if (speaking) {
      // Restart with new rate if currently speaking
      cancel();
      setTimeout(() => {
        speak({
          text: text,
          voice,
          rate: parseFloat(e.target.value),
          pitch: selectedVoiceType === 'female' ? 1.1 : 0.9,
          volume: 1
        });
      }, 100);
    }
  };

  const CloseSettingHandler = () => {
    if (textSpeechSettingFlag) setTextSpeechSettingFlag(false);
  }

  const handleSettingToggle = () => {
    if (disabled) return; // Disable if summary is not fully generated
    setTextSpeechSettingFlag(!textSpeechSettingFlag);
  }

  // setting the localstorage setting to currentstate
  useEffect(() => {
    const voiceSetting = JSON.parse(localStorage.getItem(VOICEKEY));
    if (voiceSetting) {
      // {lang_accent:"en-IN",gender:"female",speed:1}
      setSelectedLanguage(voiceSetting?.lang_accent);
      setSelectedVoiceType(voiceSetting?.gender);
      setPlaybackRate(voiceSetting?.speed);
    }
    else {
      setSelectedLanguage('en-IN');
      setSelectedVoiceType('female');
      setPlaybackRate(1);
    }
  }, [])

  // Update state when speech starts/stops
  useEffect(() => {
    if (!speaking && isPlaying) {
      setIsPlaying(false);
      setIsPaused(false);
      onStop?.();
    }
  }, [speaking, isPlaying, onStop]);

  // Stop speech when component unmounts or text changes
  useEffect(() => {
    return () => {
      if (speaking) {
        cancel();
      }
    };
  }, [speaking, cancel]);

  if (!supported) {
    return (
      <button
        disabled
        className="p-1 text-gray-400 cursor-not-allowed"
        title="Text-to-speech not supported in this browser"
      >
        <FiVolume2 size={14} />
      </button>
    );
  }

  return (
    <div className={`flex flex-row sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 bg-blue-100 rounded-lg p-2 mr-3 ${
      disabled ? "opacity-50" : ""
    }`}>
      {/* Controls Row 1: Language and Voice Type */}

      <div 
        className="flex items-center space-x-2" 
        onClick={CloseSettingHandler}
      >
        {/* Play/Pause Button */}
        {!isPlaying && !isPaused ? (
          <motion.button
            onClick={handlePlay}
            disabled={disabled}
            className={`p-1 transition-colors duration-200 rounded ${
              disabled 
                ? "text-gray-400 cursor-not-allowed" 
                : "text-blue-600 hover:text-blue-800"
            }`}
            title={disabled ? "Wait for summary to complete" : "Play summary"}
            whileHover={!disabled ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: 0.9 } : {}}
          >
            <FiPlay size={14} />
          </motion.button>
        ) : isPaused ? (
          <motion.button
            onClick={handlePlay}
            disabled={disabled}
            className={`p-1 transition-colors duration-200 rounded ${
              disabled 
                ? "text-gray-400 cursor-not-allowed" 
                : "text-blue-600 hover:text-blue-800"
            }`}
            title={disabled ? "Wait for summary to complete" : "Resume summary"}
            whileHover={!disabled ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: 0.9 } : {}}
          >
            <FiPlay size={14} />
          </motion.button>
        ) : (
          <motion.button
            onClick={handlePause}
            disabled={disabled}
            className={`p-1 transition-colors duration-200 rounded ${
              disabled 
                ? "text-gray-400 cursor-not-allowed" 
                : "text-blue-600 hover:text-blue-800"
            }`}
            title={disabled ? "Wait for summary to complete" : "Pause summary"}
            whileHover={!disabled ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: 0.9 } : {}}
          >
            <FiPause size={14} />
          </motion.button>
        )}

        {/* Stop Button */}
        {(isPlaying || isPaused) && (
          <motion.button
            onClick={handleStop}
            disabled={disabled}
            className={`p-1 transition-colors duration-200 rounded ${
              disabled 
                ? "text-gray-400 cursor-not-allowed" 
                : "text-red-600 hover:text-red-800"
            }`}
            title={disabled ? "Wait for summary to complete" : "Stop summary"}
            whileHover={!disabled ? { scale: 1.1 } : {}}
            whileTap={!disabled ? { scale: 0.9 } : {}}
          >
            <FiSquare size={12} />
          </motion.button>
        )}

        {/* Speaking Indicator */}
        {isPlaying && (
          <motion.div
            className="flex space-x-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-4 bg-blue-500 rounded-full"
                animate={{
                  height: [4, 12, 4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        )}
      </div>
      <div className="p-2 flex items-center justify-center">
        <div className="setting flex items-center absolute">
          <div
            className={`setting-icon ${
              disabled ? "text-gray-400 cursor-not-allowed" : "text-blue-600 cursor-pointer"
            }`}
            onClick={handleSettingToggle}
            title={disabled ? "Wait for summary to complete" : "Speech settings"}
          >
            <RiListSettingsFill />
          </div>

          {textSpeechSettingFlag && !disabled && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0.9 }}
              animate={{ scale: 1, opacity: 1 }}
              onMouseLeave={() => setTextSpeechSettingFlag(false)}
              className="p-2 absolute z-10 shadow-md shadow-gray-200 right-0 top-full mt-2 w-40 max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg"
            >        
              <div className="w-full flex items-center flex-col">
                {/* Language Selector */}
                <div className="w-full my-2">
                  <select
                    value={selectedLanguage}
                    onChange={handleLanguageChange}
                    className="text-[10px] bg-white border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-quantchat w-full"
                    disabled={isPlaying || isPaused}
                  >
                    <option value="en-IN">English (India) 🇮🇳</option>
                    <option value="en-US">English (US) 🇺🇸</option>
                    <option value="en-GB">English (UK) 🇬🇧</option>
                    <option value="en-AU">English (Australia) 🇦🇺</option>
                    <option value="en-CA">English (Canada) 🇨🇦</option>
                  </select>
                </div>

                {/* Voice Type Selector */}
                <div className="w-full mb-2">
                  <select
                    value={selectedVoiceType}
                    onChange={handleVoiceTypeChange}
                    className="text-[10px] bg-white border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-quantchat w-full"
                    disabled={isPlaying || isPaused}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>

              {/* Controls Row 2: Playback Rate and Controls */}
              <div className="flex items-center w-full justify-between mb-2">
                {/* Playback Rate Selector */}
                <div className="flex items-center w-full flex-col">
                  <div className="my-2 text-xs font-semibold">
                    {playbackRate} X
                  </div>
                  <input
                    className="mt-2 w-full appearance-auto bg-gray-200 h-1 accent-quantchat [&::-webkit-slider-thumb]:bg-quantchat cursor-pointer"
                    type="range"
                    id="speech-speed"
                    step={0.25}
                    value={playbackRate}
                    min={0.25}
                    max={2}
                    title="playback rate"
                    disabled={isPlaying || isPaused}
                    onChange={handlePlaybackRateChange}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextToSpeechControls;