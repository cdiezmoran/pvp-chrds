import React, { useEffect, useState, useRef } from 'react';
import { AsyncStorage, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useQuery, useMutation } from '@apollo/react-hooks';
import { connect } from 'react-redux';
import { Camera } from 'expo-camera';
import * as Permissions from 'expo-permissions';
import * as Brightness from 'expo-brightness';
import * as FileSystem from 'expo-file-system';
import jwtDecode from 'jwt-decode';
import { func, object } from 'prop-types';

import mime from '../helpers/mimeTypes';
import { useAnimation } from '../helpers/hooks';
import { upload } from '../actions/file';

import GET_DATA from '../graphql/queries/getCameraData';
import UPDATE_MATCH from '../graphql/mutations/updateMatch';

import MainControls from '../components/Camera/MainControls';
import VideoOverlay from '../components/Camera/VideoOverlay';
import CountdownPopup from '../components/Camera/CountdownPopup';
import TopControls from '../components/Camera/TopControls';
import BottomControls from '../components/Camera/BottomControls';
import ReplayModal from '../components/Match/ReplayModal';

const mapDispatchToProps = dispatch => ({
  uploadFile: file => dispatch(upload(file))
});

const { front: frontType } = Camera.Constants.Type;
const { off: flashOff, on: flashOn, torch } = Camera.Constants.FlashMode;

let originalBrightness;

const CameraScreen = ({ navigation, uploadFile }) => {
  const categoryID = navigation.getParam('categoryID', '');
  const opponentID = navigation.getParam('opponentID', '');
  const matchID = navigation.getParam('matchID', '');

  const { data } = useQuery(GET_DATA, {
    variables: { categoryID, opponentID, matchID }
  });
  const [hasPermissions, setPermissions] = useState(false);
  const [cameraType, setCameraType] = useState(frontType);
  const [flash, setFlash] = useState(flashOff);
  const [isRecording, setRecording] = useState(false);
  const [isCounting, setCounting] = useState(false);
  const [displayReplay, setDisplayReplay] = useState(false);
  const [videoUri, setVideoUri] = useState('');
  const [word, setWord] = useState('');
  const [userID, setUserID] = useState('');
  const [rollCount, setRollCount] = useState(2);
  const [updateMatch] = useMutation(UPDATE_MATCH);
  const { animationValue, animateTo } = useAnimation({ duration: 200 });

  const category = data ? data.category : {};
  const opponent = data ? data.opponent : {};
  const match = data ? data.match : {};

  const camera = useRef(null);
  const cameraAnimation = useRef(null);
  const flashAnimation = useRef(null);

  useEffect(() => {
    checkPermissions();
    setBrightness(true);
    getUserID();
    getRolls();
  }, []);

  useEffect(() => {
    if (isRecording) animateTo(1);
    else animateTo(0);

    setBrightness();
  }, [isRecording]);

  useEffect(() => {
    if (data && data.category) getCategoryWord();
    if (data && data.match) displayReplayIfNeeded();
  }, [data]);

  const getUserID = async () => {
    const { _id } = jwtDecode(await AsyncStorage.getItem('CHRDS_TOKEN'));
    setUserID(_id);
  };

  const getRandomWord = () => {
    let randWord;

    do {
      const randomIndex = Math.floor(Math.random() * category.words.length);
      randWord = category.words[randomIndex];
    } while (randWord.text === word.text);

    setWord(randWord);
    AsyncStorage.setItem(`${matchID}-word`, JSON.stringify(randWord));
  };

  const getCategoryWord = async () => {
    const storedWord = await AsyncStorage.getItem(`${matchID}-word`);

    if (storedWord) {
      setWord(JSON.parse(storedWord));
      return;
    }

    getRandomWord();
  };

  const getRolls = async () => {
    const rolls = await AsyncStorage.getItem(`${matchID}-rolls`);
    if (rolls) setRollCount(parseInt(rolls, 10));
  };

  const displayReplayIfNeeded = () => {
    if (match.replayWord) setDisplayReplay(true);
  };

  const closeReplay = () => {
    setDisplayReplay(false);
    removeReplayWord();
  };

  const setState = newState =>
    Object.keys(newState).forEach(property => {
      const value = newState[property];
      switch (property) {
        case 'flash':
          if (value !== flashOff && flashAnimation.current)
            flashAnimation.current.play(60, 116);
          else if (value === flashOff && flashAnimation.current)
            flashAnimation.current.play(150, 204);
          return setFlash(value);
        case 'cameraType':
          if (value !== frontType && cameraAnimation.current)
            cameraAnimation.current.play(60, 72);
          else if (value === frontType && cameraAnimation.current)
            cameraAnimation.current.play(134, 150);
          return setCameraType(value);
        case 'isRecording':
          return setRecording(value);
        case 'videoUri':
          return setVideoUri(value);
        case 'isCounting':
          return setCounting(value);
        default:
          break;
      }
    });

  const setBrightness = async (original = false) => {
    const currentBrightness = await Brightness.getSystemBrightnessAsync();
    if (original) {
      originalBrightness = currentBrightness;
      return;
    }

    if (isRecording && cameraType === frontType && flash === flashOn)
      await Brightness.setSystemBrightnessAsync(1);
    else if (!isRecording && currentBrightness === 1) {
      await Brightness.setSystemBrightnessAsync(originalBrightness);
    }
  };

  const handleCountdownEnd = () => {
    setState({ isRecording: true, isCounting: false });
    recordVideo();
  };

  const goBack = () => navigation.navigate('Home');

  const checkPermissions = async () => {
    const { CAMERA, AUDIO_RECORDING, SYSTEM_BRIGHTNESS } = Permissions;
    const { status } = await Permissions.askAsync(
      CAMERA,
      AUDIO_RECORDING,
      SYSTEM_BRIGHTNESS
    );

    if (status !== 'granted') navigation.goBack();
    else setPermissions(true);
  };

  const stopRecording = () => {
    if (camera.current === null) return;

    camera.current.stopRecording();
    setRecording(false);
  };

  const recordVideo = async () => {
    if (camera.current === null) return;
    setRecording(true);
    const { uri } = await camera.current.recordAsync({
      quality: Camera.Constants.VideoQuality['480p'],
      maxDuration: 6,
      mute: true
    });
    setState({ isRecording: false, videoUri: uri });
  };

  const handleSend = async () => {
    const { size } = await FileSystem.getInfoAsync(videoUri, { size: true });
    const extension = videoUri.split('.').pop();
    const name = `${match._id}-round.${extension}`;

    const file = {
      uri: videoUri,
      name,
      size,
      type: mime(extension),
      matchID: match._id,
      opponentID: opponent._id,
      actedWord: word._id,
      cameraType
    };

    uploadFile(file);
    await AsyncStorage.removeItem(`${matchID}-word`);

    navigation.navigate('Home');
  };

  const handleReplay = async () => {
    await AsyncStorage.setItem(
      `${matchID}-word`,
      JSON.stringify(match.replayWord)
    );
    setWord(match.replayWord);
    removeReplayWord();
  };

  const handleRoll = async () => {
    if (rollCount <= 0) return;
    const newRollCount = rollCount - 1;

    getRandomWord();
    setRollCount(newRollCount);
    await AsyncStorage.setItem(`${matchID}-rolls`, `${newRollCount}`);
  };

  const removeReplayWord = () => {
    const properties = JSON.stringify({ replayWord: null });
    updateMatch({ variables: { matchID, properties } });
  };

  const waitForCountdown = () => setCounting(true);
  const closeVideo = () => setVideoUri(null);

  const renderTopControls = () => (
    <TopControls
      goBack={videoUri ? closeVideo : goBack}
      iconName={videoUri ? 'md-close' : 'ios-arrow-round-back'}
      uri={opponent.profilePic}
      username={opponent.displayName}
      userScore={match.score ? JSON.parse(match.score)[userID] : 0}
      opponentScore={match.score ? JSON.parse(match.score)[opponent._id] : 0}
      isRecording={isRecording}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      {hasPermissions ? (
        <View style={styles.cameraWrapper}>
          <Camera
            style={{ flex: 1 }}
            type={cameraType}
            flashMode={isRecording && flash === flashOn ? torch : flashOff}
            ratio="16:9"
            ref={camera}
          />
          {!isRecording ? renderTopControls() : null}
          <MainControls
            flash={flash}
            cameraType={cameraType}
            recordVideo={waitForCountdown}
            setState={setState}
            isRecording={isRecording}
            cameraAnimationRef={cameraAnimation}
            flashAnimationRef={flashAnimation}
            animationValue={animationValue}
            word={word.text}
            stopRecording={stopRecording}
            rollCount={rollCount}
            roll={handleRoll}
            categoryColor={category.color}
          />
        </View>
      ) : (
        <Text>Doesnt have permissions screen</Text>
      )}
      {videoUri ? (
        <VideoOverlay
          uri={videoUri}
          setState={setState}
          cameraType={cameraType}
        >
          {renderTopControls()}
          <BottomControls send={handleSend} />
        </VideoOverlay>
      ) : null}
      {isCounting ? <CountdownPopup onEnd={handleCountdownEnd} /> : null}
      {isRecording && cameraType === frontType && flash === flashOn ? (
        <View style={styles.frontFlash} />
      ) : null}
      {displayReplay ? (
        <ReplayModal
          question={`${opponent.username} couldn't guess ${match.replayWord} and asked you to replay it. Do you want to replay that word?`}
          close={closeReplay}
          handleReplay={handleReplay}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1
  },
  frontFlash: {
    backgroundColor: '#fff',
    bottom: 0,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10
  },
  cameraWrapper: {
    flex: 1
  }
});

CameraScreen.propTypes = {
  navigation: object.isRequired,
  uploadFile: func.isRequired
};

export default connect(
  null,
  mapDispatchToProps
)(CameraScreen);
