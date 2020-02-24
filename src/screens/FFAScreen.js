import React, { useEffect, useState, useRef } from 'react';
import {
  BackHandler,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useQuery, useMutation } from '@apollo/react-hooks';
import { connect } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getDeviceId } from 'react-native-device-info';
import { func, object } from 'prop-types';

import GET_DATA from '../graphql/queries/getFFAData';
import GET_USER_DATA from '../graphql/queries/getFFAUserData';
import UPDATE_USER from '../graphql/mutations/updateUser';

import { toggleBadge, togglePurchaseModal } from '../actions/popup';

import Row from '../components/FFA/MatchRow';

import Layout from '../constants/Layout';

const deviceID = getDeviceId();
const IS_IPHONE_X =
  deviceID.includes('iPhone12') || deviceID.includes('iPhone11');

const mapDispatchToProps = dispatch => ({
  openCoinShop: () => dispatch(togglePurchaseModal(true)),
  displayBadge: (message, type) => dispatch(toggleBadge(true, message, type))
});

const FFAScreen = ({ navigation, openCoinShop, displayBadge }) => {
  const userID = navigation.getParam('userID', '');
  const { data } = useQuery(GET_DATA);
  const { data: userData, refetch } = useQuery(GET_USER_DATA, {
    variables: { userID }
  });
  const [updateUser] = useMutation(UPDATE_USER);
  const [didScroll, setDidScroll] = useState(false);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [midIndex, setMidIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(1);
  const [guessed, setGuessed] = useState({});
  const [guessing, setGuessing] = useState(false);
  const scrollView = useRef(null);

  const matches = data ? data.matches : [];
  const user = userData ? userData.user : {};

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => BackHandler.removeEventListener('hardwareBackPress');
  }, []);

  useEffect(() => {
    if (data && data.matches) {
      const initialMatches =
        data.matches.length > 2
          ? [data.matches[matches.length - 1], data.matches[0], data.matches[1]]
          : data.matches;
      const index = data.matches.length < 3 ? 0 : 1;
      setActiveIndex(index);
      setSelectedMatches(initialMatches);
    }
  }, [data]);

  useEffect(() => {
    if (userData && userData.user) {
      const { ffaGuessed } = userData.user;
      setGuessed(JSON.parse(ffaGuessed || '{}'));
    }
  }, [userData]);

  const addToGuessed = _id => result =>
    setGuessed({ ...guessed, [_id]: result });

  const handleInitialSizeChange = (contentWidth, contentHeight) => {
    if (!didScroll && contentHeight !== 0 && data.matches.length > 2) {
      scrollView.current.scrollTo({
        x: 0,
        y: Layout.window.height,
        animated: false
      });
      setDidScroll(true);
    }
  };

  const handleScrollEnd = ({
    nativeEvent: {
      contentOffset: { y }
    }
  }) => {
    const newIndex = y === 0 ? 0 : y / Layout.window.height;
    const matchesLen = matches.length;
    let newMatches = [];
    let useIndex;

    if (data.matches.length === 1) return;

    if (data.matches.length === 2) {
      setActiveIndex(newIndex);
      setSelectedMatches(data.matches);
      return;
    }

    if (newIndex === 2) {
      useIndex = midIndex === matchesLen - 1 ? 0 : midIndex + 1;
      newMatches = [
        matches[midIndex],
        matches[useIndex],
        matches[useIndex === matchesLen - 1 ? 0 : useIndex + 1]
      ];
    } else if (newIndex === 0) {
      useIndex = midIndex === 0 ? matchesLen - 1 : midIndex - 1;
      newMatches = [
        matches[useIndex === 0 ? matchesLen - 1 : useIndex - 1],
        matches[useIndex],
        matches[midIndex]
      ];
    }

    scrollView.current.scrollTo({
      x: 0,
      y: Layout.window.height,
      animated: false
    });

    setMidIndex(useIndex);

    setSelectedMatches(newMatches);
  };

  const goBack = async () => {
    if (guessing) setGuessing(false);
    else {
      navigation.navigate('Home', { userID });
      return true;
    }
    return false;
  };

  const renderMatches = () =>
    selectedMatches.map(
      ({ _id, video, category, sender, actedWord }, index) => (
        <Row
          _id={_id}
          uri={video}
          active={index === activeIndex}
          username={sender.displayName}
          categoryName={category.name}
          word={actedWord}
          openCoinShop={openCoinShop}
          refetchUser={refetch}
          user={user}
          updateUser={updateUser}
          guessed={guessed}
          addToGuessed={addToGuessed(_id)}
          guessing={guessing}
          setGuessing={setGuessing}
          displayBadge={displayBadge}
          key={_id}
        />
      )
    );

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="rgba(0,0,0,0)"
        barStyle="light-content"
        translucent
      />
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.back} onPress={goBack}>
          <Ionicons name="ios-arrow-round-back" color="#fff" size={30} />
        </TouchableOpacity>
      </View>
      <View style={{ height: '100%' }}>
        <ScrollView
          ref={scrollView}
          bounces={false}
          disableIntervalMomentum
          pagingEnabled
          decelerationRate="fast"
          snapToAlignment="start"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={handleInitialSizeChange}
          onMomentumScrollEnd={handleScrollEnd}
        >
          {renderMatches()}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2f2f2f',
    flex: 1
  },
  navbar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 52,
    left: 0,
    paddingHorizontal: 24,
    paddingTop: IS_IPHONE_X ? 44 : 24,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 5
  }
});

FFAScreen.propTypes = {
  navigation: object.isRequired,
  openCoinShop: func.isRequired,
  displayBadge: func.isRequired
};

export default connect(
  null,
  mapDispatchToProps
)(FFAScreen);
