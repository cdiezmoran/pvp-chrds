/* eslint-disable no-param-reassign */
import React, { useEffect, useState } from 'react';
import {
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { connect } from 'react-redux';
import { useQuery, useMutation } from '@apollo/react-hooks';
import {
  RecyclerListView,
  DataProvider,
  LayoutProvider
} from 'recyclerlistview';
import { func, object } from 'prop-types';

import GET_DATA from '../graphql/queries/getProfileData';
import CREATE_FRIEND_REQUEST from '../graphql/mutations/createFriendRequest';
import REMOVE_FRIEND from '../graphql/mutations/removeFriend';
import UPDATE_USER from '../graphql/mutations/updateUser';
import DELETE_FFA_MATCH from '../graphql/mutations/deleteFFAMatch';

import { analytics } from '../helpers/firebaseClients';
import { addThumbnail } from '../actions/cache';
import { togglePlay, toggleBadge, togglePurchasePopup } from '../actions/popup';
import { useAnimation } from '../helpers/hooks';
import Layout from '../constants/Layout';

import Header from '../components/Profile/Header';
import MatchRow from '../components/Profile/MatchRow';
import OptionsModal, { Option } from '../components/Profile/OptionsModal';
import AnimatedNav from '../components/AnimatedNav';
import Loader from '../components/Profile/Loader';

const mapDispatchToProps = dispatch => ({
  addToCache: (_id, uri) => dispatch(addThumbnail(_id, uri)),
  openPlay: data => dispatch(togglePlay(true, data)),
  displayBadge: (message, type) => dispatch(toggleBadge(true, message, type)),
  openShop: () => dispatch(togglePurchasePopup(true))
});

const mapStateToProps = ({ cache: { thumbnails } }) => ({
  thumbnailCache: thumbnails
});

const ViewTypes = {
  HEADER: 0,
  SELF_HEADER: 1,
  MATCH_ROW: 2
};

const provider = new DataProvider((a, b) => a[0]._id !== b[0]._id);

const PRE_ICON = Platform.OS === 'ios' ? 'ios' : 'md';

// let profileUserID = '';

const ProfileScreen = ({
  navigation,
  thumbnailCache,
  addToCache,
  openPlay,
  displayBadge,
  openShop
}) => {
  const profileUserID = navigation.getParam('profileUserID', '');
  const userID = navigation.getParam('userID', '');

  const { data, refetch } = useQuery(GET_DATA, {
    variables: { _id: profileUserID, userID }
  });
  const [createFriendRequest] = useMutation(CREATE_FRIEND_REQUEST);
  const [removeFriend] = useMutation(REMOVE_FRIEND);
  const [updateUser] = useMutation(UPDATE_USER);
  const [deleteMatch] = useMutation(DELETE_FFA_MATCH);
  const [dataProvider, setDataProvider] = useState(null);
  const [layoutProvider, setLayoutProvider] = useState(null);
  const [displayMore, setDisplayMore] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  const [blockedIndex, setBlockedIndex] = useState(-1);
  const [displayingNavbar, setDisplayingNavbar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { animationValue, animateTo } = useAnimation();

  const user = data ? data.user : {};
  const profileUser = data ? data.profileUser : {};
  const matches = data ? data.matches : [];

  useEffect(() => {
    createLayoutProvider();
    analytics.setCurrentScreen('Profile');
    if (data) refetch();
  }, []);

  useEffect(() => {
    if (Object.prototype.hasOwnProperty.call(user, '_id')) checkBlockIndex();
    if (data && data.matches && data.matches.length > 0) createData();
    if (data && data.matches && data.matches.length === 0) setLoading(false);
    if (Object.prototype.hasOwnProperty.call(profileUser, '_id'))
      checkIfIsFriend();
  }, [data]);

  const createLayoutProvider = () => {
    const LP = new LayoutProvider(
      index => {
        if (index === 0 && userID !== profileUserID) return ViewTypes.HEADER;
        if (index === 0 && userID === profileUserID)
          return ViewTypes.SELF_HEADER;
        return ViewTypes.MATCH_ROW;
      },
      (type, dim) => {
        switch (type) {
          case ViewTypes.HEADER:
            dim.width = Layout.window.width;
            dim.height = 358;
            break;
          case ViewTypes.SELF_HEADER:
            dim.width = Layout.window.width;
            dim.height = 298;
            break;
          case ViewTypes.MATCH_ROW:
            dim.width = Layout.window.width;
            dim.height = (Layout.window.width - 72) / 2 + 12;
            break;
          default:
            dim.width = 0;
            dim.height = 0;
        }
      }
    );
    setLayoutProvider(LP);
  };

  const createData = () => {
    const dividedMatches = [[{ _id: 'headerIndex' }]];
    const numberOfRows = Math.ceil(matches.length / 3);
    let sliceFrom = 0;

    for (let i = 0; i < numberOfRows; i += 1) {
      const sliceTo = sliceFrom + 3;
      dividedMatches.push(matches.slice(sliceFrom, sliceTo));
      sliceFrom = sliceTo;
    }

    setDataProvider(provider.cloneWithRows(dividedMatches));
    setLoading(false);
  };

  const handleAddFriend = async () => {
    try {
      await createFriendRequest({
        variables: { to: profileUser._id, from: userID }
      });
      displayBadge('Your Friend Request is on the way!', 'success');
      refetch();
      closeMore();
    } catch (exception) {
      console.warn(exception.message);
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await removeFriend({
        variables: { _id: profileUser._id, friendID: userID }
      });
      displayBadge('Friend removed successfully', 'success');
      refetch();
      closeMore();
    } catch (exception) {
      console.warn(exception);
    }
  };

  const handleBlockUser = async () => {
    const properties = JSON.stringify({
      blockedUsers: user.blockedUsers
        ? [...user.blockedUsers, profileUserID]
        : [profileUserID]
    });

    try {
      await updateUser({ variables: { id: userID, properties } });
      refetch();
      displayBadge('User has been blocked!', 'success');
      closeMore();
    } catch (exception) {
      console.warn(exception.message);
      displayBadge('There was an error blocking this user.', 'error');
    }
  };

  const handleUnblockUser = async () => {
    const properties = JSON.stringify({
      blockedUsers: [
        ...user.blockedUsers.slice(0, blockedIndex),
        ...user.blockedUsers.slice(blockedIndex + 1)
      ]
    });

    try {
      await updateUser({ variables: { id: userID, properties } });
      refetch();
      displayBadge('User has been un-blocked!', 'success');
      closeMore();
    } catch (exception) {
      console.warn(exception.message);
      displayBadge('There was an error un-blocking this user.', 'error');
    }
  };

  const handleDeleteMatch = async () => {
    const { _id } = selectedMatch;
    try {
      await deleteMatch({ variables: { _id } });
      await refetch();
      displayBadge('Match deleted successfully!', 'success');
      closeFFAOptions();
    } catch (exception) {
      console.warn(exception.message);
      displayBadge('There was an error deleting your match.', 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleScroll = ({
    nativeEvent: {
      contentOffset: { y }
    }
  }) => {
    if (y >= 138 && !displayingNavbar) {
      animateTo(1);
      setDisplayingNavbar(true);
    } else if (y < 138 && displayingNavbar) {
      animateTo(0);
      setDisplayingNavbar(false);
    }
  };
  const checkIfIsFriend = () => {
    const index = profileUser.friends.findIndex(({ _id }) => _id === userID);

    if (index === -1) {
      if (isFriend) setIsFriend(false);
      return;
    }

    setIsFriend(true);
  };

  const checkBlockIndex = () => {
    const index = user.blockedUsers
      ? user.blockedUsers.indexOf(profileUserID)
      : -1;
    setBlockedIndex(index);
  };

  const handleOpenPlay = () => openPlay({ playFriend: profileUser._id });
  const openMore = () => setDisplayMore(true);
  const closeMore = () => setDisplayMore(false);
  const openFFAOptions = match => () => {
    if (profileUserID !== userID) return;
    setSelectedMatch(match);
  };
  const closeFFAOptions = () => setSelectedMatch(null);

  const goBack = () => navigation.goBack();
  const goToVideo = index => () =>
    navigation.navigate('ProfileFFA', {
      userID,
      profileUserID,
      initialRenderIndex: index
    });
  const goToSettings = () => navigation.navigate('Settings');

  const renderHeader = () => (
    <Header
      goBack={goBack}
      user={profileUser}
      gameCount={matches.length}
      isSelf={profileUserID === userID}
      onChallengePress={handleOpenPlay}
      onMorePress={openMore}
      navigateToSettings={goToSettings}
      openShop={openShop}
    />
  );

  const rowRenderer = (type, rowMatches, index) =>
    type === ViewTypes.HEADER || type === ViewTypes.SELF_HEADER ? (
      renderHeader()
    ) : (
      <MatchRow
        matches={rowMatches}
        thumbnailCache={thumbnailCache}
        addToCache={addToCache}
        openOptions={openFFAOptions}
        goToVideo={goToVideo}
        rowIndex={index - 1}
      />
    );

  return loading ? (
    <SafeAreaView style={{ flex: 1 }} forceInset={{ top: 'never' }}>
      <Loader goBack={goBack} isSelf={profileUserID === userID} />
    </SafeAreaView>
  ) : (
    <SafeAreaView style={{ flex: 1 }} forceInset={{ top: 'never' }}>
      <AnimatedNav
        animationValue={animationValue}
        goBack={goBack}
        uri={profileUser.profilePic}
        title={profileUser.displayName}
      />
      <View style={styles.container}>
        {displayMore ? (
          <OptionsModal title="More" close={closeMore}>
            {isFriend ? (
              <Option
                title="Remove Friend"
                iconName={`${PRE_ICON}-remove-circle-outline`}
                onPress={handleRemoveFriend}
              />
            ) : (
              <Option
                title="Add friend"
                iconName={`${PRE_ICON}-person-add`}
                onPress={handleAddFriend}
              />
            )}
            <View style={styles.divider} />
            {blockedIndex === -1 ? (
              <Option
                title="Block content from this user"
                iconName="ban"
                iconType="fa5"
                onPress={handleBlockUser}
              />
            ) : (
              <Option
                title="Un-block content from this user"
                iconName="ban"
                iconType="fa5"
                onPress={handleUnblockUser}
              />
            )}
          </OptionsModal>
        ) : null}
        {selectedMatch ? (
          <OptionsModal title="Options" close={closeFFAOptions}>
            {/* <Option title="Show Info" iconName="ios-information-circle" /> */}
            <View style={styles.divider} />
            <Option
              title="Delete"
              iconName="ios-warning"
              onPress={handleDeleteMatch}
            />
          </OptionsModal>
        ) : null}
        {dataProvider !== null &&
        blockedIndex === -1 &&
        layoutProvider !== null ? (
          <RecyclerListView
            layoutProvider={layoutProvider}
            dataProvider={dataProvider}
            rowRenderer={rowRenderer}
            onScroll={handleScroll}
            scrollViewProps={{
              showsVerticalScrollIndicator: false,
              refreshControl: (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              )
            }}
          />
        ) : (
          <>
            {renderHeader()}
            {blockedIndex === -1 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No Games</Text>
                <Text style={styles.emptyText}>
                  This user has no Free for All games.
                </Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Content Blocked</Text>
                <Text style={styles.emptyText}>
                  You have blocked this user.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FCFCFE',
    minHeight: Layout.window.height - 52,
    overflow: 'hidden',
    paddingTop: 0,
    paddingBottom: 24
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24
  },
  emptyTitle: {
    fontFamily: 'sf-bold',
    fontSize: 24,
    opacity: 0.6,
    marginBottom: 12
  },
  emptyText: {
    fontFamily: 'sf-light',
    fontSize: 16,
    opacity: 0.4
  },
  divider: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    height: 1,
    width: '100%'
  }
});

ProfileScreen.propTypes = {
  navigation: object.isRequired,
  thumbnailCache: object.isRequired,
  addToCache: func.isRequired,
  openPlay: func.isRequired,
  displayBadge: func.isRequired,
  openShop: func.isRequired
};

export default connect(mapStateToProps, mapDispatchToProps)(ProfileScreen);
