import React from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDeviceId } from 'react-native-device-info';
import { func, object, string } from 'prop-types';

const deviceID = getDeviceId();

const IS_IPHONE_X =
  deviceID.includes('iPhone12') || deviceID.includes('iPhone11');

const AnimatedNav = ({ animationValue, goBack, uri, title }) => {
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
      <Text style={styles.title}>{title}</Text>
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
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
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

AnimatedNav.propTypes = {
  animationValue: object.isRequired,
  goBack: func.isRequired,
  uri: string,
  title: string
};

AnimatedNav.defaultProps = {
  uri: 'https://feather-static.s3-us-west-2.amazonaws.com/chrds-logo-bg.jpeg',
  title: 'Settings'
};

export default AnimatedNav;
