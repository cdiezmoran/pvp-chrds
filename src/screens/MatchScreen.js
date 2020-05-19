import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { useQuery, useMutation } from '@apollo/react-hooks';
import { connect } from 'react-redux';
import { Video } from 'expo-av';
import { AdMobRewarded, setTestDeviceIDAsync } from 'expo-ads-admob';
import { func, object } from 'prop-types';

import GET_DATA from '../graphql/queries/getMatchData';
import GET_USER from '../graphql/queries/getMatchUser';
import UPDATE_DATA from '../graphql/mutations/updateMatchScreenData';
import UPDATE_MATCH from '../graphql/mutations/updateMatch';
import UPDATE_USER from '../graphql/mutations/updateUser';
import DELETE_MATCH from '../graphql/mutations/deleteMatch';

import callApi, { getSignedUrl } from '../helpers/apiCaller';
import { analytics } from '../helpers/firebaseClients';
import { toggleBadge, togglePurchasePopup } from '../actions/popup';

import AdData from '../constants/AdData';

import TopControls from '../components/Camera/TopControls';
import LetterSoup from '../components/Match/LetterSoup';
import TimeBar from '../components/Match/TimeBar';
import SuccessOverlay from '../components/Match/SuccessOverlay';
import FailOverlay from '../components/Match/FailOverlay';
import EndOverlay from '../components/Match/EndOverlay';
import PowerUps from '../components/Match/PowerUps';
import Hint from '../components/Match/HintModal';
import PurchaseModal from '../components/Match/PurchaseModal';
import AdRetryModal from '../components/Match/AdRetryModal';
import VideoButton from '../components/VideoButton';

const PRE_ICON = Platform.OS === 'ios' ? 'ios' : 'md';
const TIME = 600;

const mapDispatchToProps = dispatch => ({
  openCoinShop: () => dispatch(togglePurchasePopup(true)),
  displayBadge: (message, type) => dispatch(toggleBadge(true, message, type))
});

const MatchScreen = ({ navigation, openCoinShop, displayBadge }) => {
  const categoryID = navigation.getParam('categoryID', '');
  const opponentID = navigation.getParam('opponentID', '');
  const matchID = navigation.getParam('matchID', '');
  const userID = navigation.getParam('userID', '');
  const { data } = useQuery(GET_DATA, {
    variables: { categoryID, opponentID, matchID }
  });
  const { data: userData, refetch: refetchUser } = useQuery(GET_USER, {
    variables: { _id: userID }
  });
  const [updateData] = useMutation(UPDATE_DATA);
  const [updateMatch] = useMutation(UPDATE_MATCH);
  const [deleteMatch] = useMutation(DELETE_MATCH);
  const [updateUser] = useMutation(UPDATE_USER);
  const [gameState, setGameState] = useState('awaitUser');
  const [playCount, setPlayCount] = useState(0);
  const [uriFlag, setUriFlag] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [resultStatus, setResultStatus] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME);
  const [milis, setMilis] = useState(10);
  const [medalCount, setMedalCount] = useState(3);
  const [powerup, setPowerup] = useState('');
  const [displayHint, setDisplayHint] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [fillActive, setFillActive] = useState(false);
  const [isLoadingAd, setLoadingAd] = useState(false);
  const [didReward, setDidReward] = useState(false);
  const videoRef = useRef(null);

  const category = data ? data.category : {};
  const opponent = data ? data.opponent : {};
  const match = data ? data.match : {};
  const user = userData ? userData.user : {};

  useEffect(() => {
    if (match.video && videoRef && !uriFlag) fetchSignedUri();
  }, [match, videoRef]);

  useEffect(() => {
    AdMobRewarded.setAdUnitID(AdData.unitID);
    setTestDeviceIDAsync(AdData.deviceID);

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    AdMobRewarded.addEventListener(
      'rewardedVideoDidRewardUser',
      handleAdReward
    );
    AdMobRewarded.addEventListener('rewardedVideoDidFailToLoad', handleAdFail);
    AdMobRewarded.addEventListener('rewardedVideoDidLoad', handleAdLoaded);

    analytics.setCurrentScreen('Match');
    return () => {
      BackHandler.removeEventListener('hardwareBackPress');
      AdMobRewarded.removeEventListener('rewardedVideoDidRewardUser');
      AdMobRewarded.removeEventListener('rewardedVideoDidFailToLoad');
      AdMobRewarded.removeEventListener('rewardedVideoDidLoad');
    };
  }, []);

  const handleBackPress = () => gameState !== 'guessing';

  const fetchSignedUri = async () => {
    const filename = match.video.split('/').pop();
    const uri = await getSignedUrl(filename, 'Videos');
    await videoRef.current.loadAsync(
      { uri, androidImplementation: 'MediaPlayer' },
      {},
      true
    );
    setUriFlag(true);
  };

  const playVideo = async () => {
    const newCount = playCount + 1;
    setGameState('playVideo');
    setPlayCount(newCount);
    AsyncStorage.setItem(`${matchID}-playcount`, `${newCount}`);
    if (newCount === 1) await videoRef.current.playAsync();
    else if (newCount >= 2) await videoRef.current.replayAsync();
  };

  const getMedalCount = () => {
    let medals = 3;

    if (timeLeft <= TIME / 1.5 && timeLeft > TIME / 4) medals = 2;
    else if (timeLeft <= TIME / 4) medals = 1;

    return medals;
  };

  const switchToGuess = async () => {
    await videoRef.current.stopAsync();
    videoRef.current.unloadAsync();
    setGameState('guessing');
  };

  const handleAdReward = async () => {
    setGameState('guessing');
    setTimeLeft(TIME);
    setDidReward(true);

    analytics.logEvent('retry', { mode: '1v1', method: 'ad' });
  };

  const handleAdFail = () => {
    displayBadge('Ad failed to load.', 'error');
    setLoadingAd(false);
    handleFailure();
  };

  const handleAdLoaded = () => setLoadingAd(false);

  const handleAdRetry = async () => {
    displayBadge('Loading reward ad.', 'default');
    setLoadingAd(true);
    await AdMobRewarded.requestAdAsync();
    await AdMobRewarded.showAdAsync();
  };

  const handleRetryBuy = async () => {
    const price = 40;
    const remainingCoins = user.coins - price;
    const properties = JSON.stringify({ coins: remainingCoins });
    if (user.coins < price) {
      displayBadge('You do not have enough coins!', 'error');
      openCoinShop();
      return;
    }

    await updateUser({ variables: { id: user._id, properties } });
    displayBadge(`Retry bought! ${remainingCoins} coins left.`, 'success');

    analytics.logSpendVirtualCurrency({
      item_name: 'retry_1v1',
      value: price,
      virtual_currency_name: 'coins'
    });
    analytics.logEvent('retry', { mode: '1v1', method: 'buy' });

    setGameState('guessing');
    setTimeLeft(TIME);
    setDidReward(true);
  };

  const openAdModal = () => setGameState('adRetry');

  const handleFailure = async () => {
    const properties = JSON.stringify({ state: 'play' });
    setGameState('finished');
    updateMatch({ variables: { matchID, properties } });
  };

  const handleDelete = async () => {
    const removedBy = [...match.removedBy, userID];
    const properties = JSON.stringify({ removedBy });

    await updateMatch({ variables: { matchID, properties } });

    if (match.removedBy.length >= 1)
      deleteMatch({ variables: { _id: matchID } });

    handleGoHome();
  };

  const handleGoHome = () => {
    const payload = {
      folder: 'Videos',
      isStatic: false,
      filename: `${matchID}-round.mp4`
    };

    callApi('s3/delete', payload, 'POST');

    goBack();
  };

  const handleSuccess = async () => {
    const score = JSON.parse(match.score);
    const userScore = score[userID] + 1;
    const newScore = JSON.stringify({ ...score, [userID]: userScore });
    const medals = getMedalCount();
    const gameWon = userScore === 3;
    const xp = gameWon ? user.xp + medals : user.xp + medals + 3;
    const wonGames = gameWon ? user.wonGames + 1 : user.wonGames;
    const coins = gameWon ? user.coins + 10 : user.coins;

    const matchProperties = JSON.stringify({
      state: gameWon ? 'end' : 'play',
      score: newScore,
      actedWord: null
    });
    const userProperties = JSON.stringify({ xp, wonGames, coins });

    setMedalCount(medals);
    setGameState(gameWon ? 'end' : 'finished');

    await updateData({
      variables: { userID, matchID, userProperties, matchProperties }
    });

    refetchUser();
  };

  const handleSlowDown = () => setMilis(150);
  const showHint = () => setDisplayHint(true);
  const closeHint = () => setDisplayHint(false);
  const handleBomb = () => setExploded(true);
  const handleFill = () => setFillActive(true);
  const showPurchase = selectedPowerup => () => setPowerup(selectedPowerup);
  const closePurchase = () => setPowerup('');

  const handlePurchase = cost => async () => {
    const properties = JSON.stringify({ coins: user.coins - cost });

    switch (powerup) {
      case 'bomb':
        handleBomb();
        break;
      case 'hourglass':
        handleSlowDown();
        break;
      case 'hint':
        showHint();
        break;
      case 'fill':
        handleFill();
        break;
      default:
        break;
    }

    closePurchase();

    await updateUser({ variables: { id: userID, properties } });

    analytics.logSpendVirtualCurrency({
      item_name: `${powerup}_powerup`,
      value: cost,
      virtual_currency_name: 'coins'
    });

    refetchUser();
  };

  const handlePlaybackUpdate = status => {
    if (status.isBuffering && !buffering) setBuffering(true);
    if (!status.isBuffering && buffering) setBuffering(false);
    if (status.didJustFinish && playCount === 1) setGameState('awaitUser');
    if (status.didJustFinish && playCount === 2) setGameState('guessing');
  };

  const goBack = () => navigation.navigate('Home');

  const goToCamera = () =>
    navigation.navigate('Camera', {
      matchID,
      categoryID,
      opponentID,
      userID,
      mode: 'versus'
    });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          resizeMode="cover"
          onPlaybackStatusUpdate={handlePlaybackUpdate}
          style={[
            styles.video,
            match.cameraType === 1 ? { transform: [{ scaleX: -1 }] } : {}
          ]}
        />
        {buffering ? (
          <View style={styles.videoLoader}>
            <ActivityIndicator size="small" color="#fefefe" />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        ) : null}
        {gameState === 'awaitUser' ? (
          <View style={styles.overlay}>
            <Text style={styles.infoText}>
              You can only play the video twice, you&#39;ll have 30 seconds to
              guess the word after the video ends.
            </Text>
            <VideoButton
              onPress={playVideo}
              text={`${playCount < 1 ? 'Play' : 'Replay'} Video`}
              iconName={`${PRE_ICON}-${playCount < 1 ? 'play' : 'repeat'}`}
              iconType="Ion"
            />
          </View>
        ) : null}
        {playCount > 0 &&
        gameState !== 'guessing' &&
        gameState !== 'finished' ? (
          <VideoButton
            style={styles.guessButton}
            onPress={switchToGuess}
            text="Guess Word"
            iconName="ios-arrow-forward"
            iconType="Ion"
          />
        ) : null}
        <TopControls
          goBack={goBack}
          iconName="ios-arrow-round-back"
          uri={opponent.profilePic}
          username={opponent.displayName}
          preventBack={gameState === 'guessing'}
          userScore={match.score ? JSON.parse(match.score)[userID] : 0}
          category={category}
          opponentScore={
            match.score ? JSON.parse(match.score)[opponent._id] : 0
          }
        />
        {gameState === 'guessing' ? (
          <>
            {displayHint ? (
              <Hint hint={match.actedWord.hint} close={closeHint} />
            ) : null}
            {powerup ? (
              <PurchaseModal
                powerup={powerup}
                close={closePurchase}
                coins={user.coins}
                handlePurchase={handlePurchase}
                openCoinShop={openCoinShop}
              />
            ) : null}
            <TimeBar
              onEnd={didReward ? handleFailure : openAdModal}
              timeLeft={timeLeft}
              setTimeLeft={setTimeLeft}
              milis={milis}
              isPaused={displayHint || powerup !== ''}
            />
            <LetterSoup
              word={match.actedWord.text.toUpperCase()}
              resultStatus={resultStatus}
              setResultStatus={setResultStatus}
              onSuccess={handleSuccess}
              exploded={exploded}
              fillActive={fillActive}
              setFillActive={setFillActive}
            />
            <PowerUps onPress={showPurchase} />
          </>
        ) : null}
        {gameState === 'adRetry' ? (
          <AdRetryModal
            handleWatchAd={handleAdRetry}
            handleBuy={handleRetryBuy}
            handleReject={handleFailure}
            isLoading={isLoadingAd}
          />
        ) : null}
        {gameState === 'finished' && resultStatus === 1 ? (
          <SuccessOverlay
            user={user}
            goHome={goBack}
            playNext={goToCamera}
            medalCount={medalCount}
          />
        ) : null}
        {gameState === 'finished' && resultStatus !== 1 ? (
          <FailOverlay
            word={match.actedWord.text.toUpperCase()}
            goHome={goBack}
            playNext={goToCamera}
          />
        ) : null}
        {gameState === 'end' ? (
          <EndOverlay
            goHome={handleGoHome}
            medalCount={medalCount}
            remove={handleDelete}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1
  },
  videoWrapper: {
    flex: 1
  },
  video: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1
  },
  infoText: {
    color: '#fff',
    marginBottom: 12,
    opacity: 0.5,
    textAlign: 'center',
    width: '70%'
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 6
  },
  buttonText: {
    color: '#7c4dff',
    fontFamily: 'sf-bold',
    fontSize: 18,
    marginRight: 12
  },
  guessButton: {
    bottom: 24,
    position: 'absolute',
    right: 24,
    zIndex: 5
  },
  videoLoader: {
    alignItems: 'center',
    flexDirection: 'row',
    position: 'absolute',
    right: 12,
    top: 72
  },
  loadingText: {
    color: '#fff',
    fontFamily: 'sf-regular',
    marginLeft: 6
  }
});

MatchScreen.propTypes = {
  navigation: object.isRequired,
  openCoinShop: func.isRequired,
  displayBadge: func.isRequired
};

export default connect(null, mapDispatchToProps)(MatchScreen);
