import React from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { func, object, string } from 'prop-types';

const IS_IPHONE_X =
  Constants.deviceName.includes('iPhone X') ||
  Constants.deviceName.includes('iPhone 11');

const AnimatedSettingsNav = ({ animationValue, goBack, uri }) => {
  const animateOpacity = {
    opacity: animationValue.current.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1]
    })
  };

  const animateTranslate = {
    transform: [
      {
        translateY: animationValue.current.interpolate({
          inputRange: [0, 1],
          outputRange: [-54, 0]
        })
      }
    ]
  };

  return (
    <Animated.View style={[styles.container, animateOpacity, animateTranslate]}>
      <TouchableOpacity style={styles.button} onPress={goBack}>
        <Ionicons name="ios-arrow-round-back" color="#000" size={30} />
      </TouchableOpacity>
      <Image source={{ uri }} style={styles.image} />
      <Text style={styles.title}>Settings</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
    flexDirection: 'row',
    height: 54,
    justifyContent: 'flex-start',
    left: 0,
    paddingHorizontal: 24,
    position: 'absolute',
    right: 0,
    top: IS_IPHONE_X ? 44 : 0,
    width: '100%',
    zIndex: 3
  },
  button: {
    height: 30,
    width: 30
  },
  title: {
    fontFamily: 'sf-bold',
    fontSize: 18,
    marginLeft: 12
  },
  image: {
    borderRadius: 30 / 2,
    height: 30,
    width: 30
  }
});

AnimatedSettingsNav.propTypes = {
  animationValue: object.isRequired,
  goBack: func.isRequired,
  uri: string
};

AnimatedSettingsNav.defaultProps = {
  uri: 'https://feather-static.s3-us-west-2.amazonaws.com/chrds-logo-bg.jpeg'
};

export default AnimatedSettingsNav;
