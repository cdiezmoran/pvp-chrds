import React, { useState, useEffect } from 'react';
import {
  AsyncStorage,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  useApolloClient,
  useLazyQuery,
  useMutation
} from '@apollo/react-hooks';
import { Ionicons } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Permissions from 'expo-permissions';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { object } from 'prop-types';

import callApi, { uploadFile } from '../../helpers/apiCaller';
import mime from '../../helpers/mimeTypes';

import GET_USER from '../../graphql/queries/getUserFromToken';
import UPDATE_USER from '../../graphql/mutations/updateUser';

import Layout from '../../constants/Layout';
import { useAnimation } from '../../helpers/hooks';

import AnimatedSettingsNav from '../../components/AnimatedSettingsNav';

const PRE_ICON = Platform.OS === 'ios' ? 'ios' : 'md';

const SettingsScreen = ({ navigation }) => {
  const [getUser, { data, refetch }] = useLazyQuery(GET_USER);
  const [updateProperties, { data: updateData }] = useMutation(UPDATE_USER);
  const [displayingNavbar, setDisplayingNavbar] = useState(false);
  const [imageID, setImageID] = useState('');
  const { animationValue, animateTo } = useAnimation();
  const client = useApolloClient();
  const user = data ? data.user : {};

  useEffect(() => {
    fetchUser();
    getImageID();
  }, []);

  useEffect(() => {
    if (updateData && updateData.updateUser.token) {
      updateUserToken();
    }
  }, [updateData]);

  const fetchUser = async () => {
    const token = await AsyncStorage.getItem('CHRDS_TOKEN');
    getUser({ variables: { token } });
  };

  const getImageID = async () => {
    const id = await AsyncStorage.getItem('IMG_ID');
    setImageID(id);
  };

  const updateUserToken = async () => {
    const { token } = updateData.updateUser;
    await AsyncStorage.setItem('CHRDS_TOKEN', token);
  };

  const goBack = () => navigation.navigate('Home');
  const rateApp = () => Linking.openURL(StoreReview.storeUrl());
  const sendSMS = () => Linking.openURL('sms:+5215534889576');
  const sendEmail = () => Linking.openURL('mailto:cdiezmoran@gmail.com');
  const goToGeneral = () => navigation.navigate('General');
  const goToFriends = () => navigation.navigate('Friends');

  const logout = async () => {
    await AsyncStorage.removeItem('CHRDS_TOKEN');
    client.resetStore();
    navigation.navigate('Auth');
  };

  const getSignedRequest = async ({ name, type }) => {
    try {
      const response = await callApi(
        `s3/sign?file-name=${name}&file-type=${type}&folder-name=ProfilePics&static=true`
      );
      const { signedRequest } = await response.json();
      return signedRequest;
    } catch (exception) {
      console.log(exception.message);
    }
  };

  const updateImageID = async () => {
    const newID = Math.random();

    setImageID(`${newID}`);
    await AsyncStorage.setItem('IMG_ID', `${newID}`);
  };

  const handleUploadProgress = (id, progress) => {
    console.log(progress);
  };

  const handleUploadFinish = async file => {
    const s3Url = `https://chrds-static.s3-us-west-2.amazonaws.com/ProfilePics/${file.name}`;
    const properties = JSON.stringify({ profilePic: s3Url });
    await updateProperties({ variables: { id: user._id, properties } });
    await updateImageID();
    refetch();
  };

  const pickImage = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);

    if (status !== 'granted') {
      // display badge
      return;
    }

    const { cancelled, uri } = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1
    });

    if (cancelled) return;

    const { size } = await FileSystem.getInfoAsync(uri, { size: true });
    const extension = uri.split('.').pop();
    const filename = `${user._id}-pp-.${extension}`;

    const file = {
      uri,
      size,
      type: mime(extension),
      name: filename
    };

    const signedRequest = await getSignedRequest(file);

    uploadFile(file, signedRequest, handleUploadProgress, handleUploadFinish);
  };

  const handleScroll = ({
    nativeEvent: {
      contentOffset: { y }
    }
  }) => {
    if (y >= 162 && !displayingNavbar) {
      animateTo(1);
      setDisplayingNavbar(true);
    } else if (y < 162 && displayingNavbar) {
      animateTo(0);
      setDisplayingNavbar(false);
    }
  };

  return (
    <>
      <AnimatedSettingsNav
        animationValue={animationValue}
        goBack={goBack}
        uri={`${user.profilePic}?random=${imageID}`}
      />
      <ScrollView onScroll={handleScroll} scrollEventThrottle={8}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.goBack} onPress={goBack}>
              <Ionicons name="ios-arrow-round-back" color="#000" size={30} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageWrapper} onPress={pickImage}>
              <Image
                style={styles.profilePic}
                source={{ uri: `${user.profilePic}?random=${imageID}` }}
              />
            </TouchableOpacity>
            <Text style={styles.username}>@{user.username}</Text>
            <TouchableOpacity style={styles.profileButton}>
              <Text style={styles.pbText}>View Profile</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <View style={styles.group}>
              <TouchableOpacity style={styles.row} onPress={rateApp}>
                <View style={styles.info}>
                  <View
                    style={[styles.iconWrap, { backgroundColor: '#FFC107' }]}
                  >
                    <Ionicons
                      color="#fff"
                      name={`${PRE_ICON}-star`}
                      size={28}
                    />
                  </View>
                  <Text style={[styles.rowText, { textAlign: 'center' }]}>
                    Rate the app!
                  </Text>
                </View>
                <Ionicons
                  name="ios-arrow-forward"
                  color="rgba(0,0,0,0.1)"
                  size={24}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.group}>
              <TouchableOpacity style={styles.row} onPress={goToGeneral}>
                <View style={styles.info}>
                  <View style={styles.iconWrap}>
                    <Ionicons color="#fff" name={`${PRE_ICON}-cog`} size={28} />
                  </View>
                  <Text style={styles.rowText}>General</Text>
                </View>
                <Ionicons
                  name="ios-arrow-forward"
                  color="rgba(0,0,0,0.1)"
                  size={24}
                />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row}>
                <View style={styles.info}>
                  <View style={[styles.iconWrap, styles.secondary]}>
                    <Ionicons color="#fff" name={`${PRE_ICON}-key`} size={28} />
                  </View>
                  <Text style={styles.rowText}>Privacy</Text>
                </View>
                <Ionicons
                  name="ios-arrow-forward"
                  color="rgba(0,0,0,0.1)"
                  size={24}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.group}>
              <TouchableOpacity style={styles.row} onPress={goToFriends}>
                <View style={styles.info}>
                  <View style={styles.iconWrap}>
                    <Ionicons
                      color="#fff"
                      name={`${PRE_ICON}-contacts`}
                      size={28}
                    />
                  </View>
                  <Text style={styles.rowText}>Friends</Text>
                </View>
                <Ionicons
                  name="ios-arrow-forward"
                  color="rgba(0,0,0,0.1)"
                  size={24}
                />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row}>
                <View style={styles.info}>
                  <View
                    style={[styles.iconWrap, { backgroundColor: '#3B5998' }]}
                  >
                    <Ionicons color="#fff" name="logo-facebook" size={28} />
                  </View>
                  <Text style={styles.rowText}>Connect to Facebook</Text>
                </View>
                <Ionicons
                  name="ios-arrow-forward"
                  color="rgba(0,0,0,0.1)"
                  size={24}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.group}>
              <TouchableOpacity style={styles.row}>
                <View style={styles.info}>
                  <View style={styles.iconWrap}>
                    <Ionicons color="#fff" name="ios-chatbubbles" size={28} />
                  </View>
                  <Text style={styles.rowText}>Tell us what you think</Text>
                </View>
                <Ionicons
                  name="ios-arrow-forward"
                  color="rgba(0,0,0,0.1)"
                  size={24}
                />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={sendEmail}>
                <View style={styles.info}>
                  <View style={[styles.iconWrap, styles.secondary]}>
                    <Ionicons
                      color="#fff"
                      name={`${PRE_ICON}-mail`}
                      size={28}
                    />
                  </View>
                  <Text style={styles.rowText}>Send us an Email</Text>
                </View>
                <Ionicons
                  name="ios-arrow-forward"
                  color="rgba(0,0,0,0.1)"
                  size={24}
                />
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.row} onPress={sendSMS}>
                <View style={styles.info}>
                  <View style={[styles.iconWrap, styles.secondary]}>
                    <Ionicons color="#fff" name="ios-chatboxes" size={28} />
                  </View>
                  <Text style={styles.rowText}>Send us a Text</Text>
                </View>
                <Ionicons
                  name="ios-arrow-forward"
                  color="rgba(0,0,0,0.1)"
                  size={24}
                />
              </TouchableOpacity>
            </View>
            <View style={[styles.group, { marginBottom: 0 }]}>
              <TouchableOpacity style={styles.row} onPress={logout}>
                <View style={styles.info}>
                  <View
                    style={[styles.iconWrap, { backgroundColor: '#FF5252' }]}
                  >
                    <Ionicons
                      color="#fff"
                      name={`${PRE_ICON}-log-out`}
                      size={28}
                    />
                  </View>
                  <Text style={styles.rowText}>Logout</Text>
                </View>
                <Ionicons
                  name="ios-arrow-forward"
                  color="rgba(0,0,0,0.1)"
                  size={24}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FCFCFE',
    overflow: 'hidden',
    flex: 1,
    paddingTop: getStatusBarHeight(),
    paddingBottom: 24
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  imageWrapper: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 108 / 2,
    elevation: 4,
    height: 108,
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 108
  },
  profilePic: {
    borderRadius: 96 / 2,
    height: 96,
    width: 96
  },
  username: {
    fontFamily: 'sf-bold',
    fontSize: 18,
    marginVertical: 12
  },
  profileButton: {
    alignItems: 'center',
    paddingVertical: 6,
    justifyContent: 'center',
    width: '100%'
  },
  pbText: {
    color: '#7c4dff',
    fontFamily: 'sf-bold',
    fontSize: 18
  },
  group: {
    backgroundColor: '#fff',
    borderColor: 'rgba(0,0,0,0.04)',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginBottom: 36,
    width: '100%'
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  info: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#8E8E93',
    height: 36,
    justifyContent: 'center',
    marginRight: 12,
    width: 36
  },
  rowText: {
    fontFamily: 'sf-medium',
    fontSize: 16
  },
  divider: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    height: 1,
    marginLeft: 60,
    width: Layout.window.width - 60
  },
  secondary: {
    backgroundColor: '#7c4dff'
  },
  goBack: {
    height: 30,
    left: 24,
    position: 'absolute',
    top: 24,
    width: 30
  }
});

SettingsScreen.propTypes = {
  navigation: object.isRequired
};

export default SettingsScreen;
