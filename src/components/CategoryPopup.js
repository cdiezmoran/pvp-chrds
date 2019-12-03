import React, { useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { arrayOf, func, number, shape, string } from 'prop-types';
import { useAnimation } from '../helpers/hooks';

import Popup from './Popup';

import Layout from '../constants/Layout';

const CategoryPopup = ({
  close,
  name,
  description,
  words,
  image,
  play,
  transitionPosition,
  imageID
}) => {
  const [animateTransition, setAnimateTransition] = useState({});
  const { animationValue, animateTo } = useAnimation({ autoPlay: true });
  const { x, y } = transitionPosition;

  const animateScale = {
    transform: [
      {
        scale: animationValue.current.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.25]
        })
      }
    ]
  };

  const handleContentLayout = ({
    nativeEvent: {
      layout: { height }
    }
  }) => {
    const halfWidth = Layout.window.width / 2;
    const logoHalf = (72 * 1.25) / 2;
    const transition = {
      transform: [
        {
          translateY: animationValue.current.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(y - (Layout.window.height - height) + logoHalf)]
          })
        },
        {
          translateX: animationValue.current.interpolate({
            inputRange: [0, 1],
            outputRange: [0, halfWidth - x - logoHalf + 12]
          })
        }
      ]
    };

    setAnimateTransition(transition);
  };

  const renderWords = () => {
    const selectedWords = {};

    while (Object.keys(selectedWords).length < 3) {
      const randomIndex = Math.floor(Math.random() * words.length);
      const randomWord = words[randomIndex];

      if (!selectedWords[randomWord]) selectedWords[randomWord] = 1;
    }

    return Object.keys(selectedWords).map((word, index) => (
      <Text
        key={word}
        style={[styles.word, { marginBottom: index === 2 ? 0 : 12 }]}
      >
        {word}
      </Text>
    ));
  };

  const handleClose = () => {
    animateTo(0);
    setTimeout(() => close(), 100);
  };

  const handlePlay = () => {
    setTimeout(() => play(), 100);
    close();
  };

  return (
    <>
      <Popup
        close={handleClose}
        showsDragIndicator={false}
        onContentLayout={handleContentLayout}
      >
        <View style={styles.container}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.divider} />
          <Text style={styles.wordsTitle}>Words you may play</Text>
          {renderWords()}
          <View style={styles.divider} />
          <TouchableOpacity style={styles.button} onPress={handlePlay}>
            <Text style={styles.buttonText}>Play</Text>
          </TouchableOpacity>
        </View>
      </Popup>
      <Animated.View
        style={[
          animateTransition,
          { position: 'absolute', left: x, top: y, zIndex: 30 }
        ]}
      >
        <Animated.View style={[styles.imageWrapper, animateScale]}>
          <Image
            source={{ uri: `${image}?rand=${imageID}` }}
            style={styles.logo}
          />
        </Animated.View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.OS === 'ios' ? 18 : 9
  },
  title: {
    fontFamily: 'sf-bold',
    fontSize: 28,
    marginTop: 36,
    marginBottom: Platform.OS === 'ios' ? 24 : 12,
    textAlign: 'center'
  },
  description: {
    fontFamily: 'sf-regular',
    fontSize: 18,
    textAlign: 'center'
  },
  divider: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    height: 1,
    marginVertical: Platform.OS === 'ios' ? 24 : 12,
    width: '100%'
  },
  wordsTitle: {
    fontFamily: 'sf-bold',
    fontSize: 24,
    opacity: 0.3,
    marginBottom: 22
  },
  word: {
    fontFamily: 'sf-light',
    fontSize: 22,
    marginBottom: Platform.OS === 'ios' ? 12 : 6
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#7c4dff',
    borderRadius: 8,
    justifyContent: 'center',
    paddingVertical: 6,
    marginBottom: Platform.OS === 'ios' ? 24 : 12,
    width: '50%'
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'sf-bold',
    fontSize: 18
  },
  imageWrapper: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    height: 72,
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 72
  },
  logo: {
    alignItems: 'center',
    borderRadius: 12,
    height: 66,
    justifyContent: 'center',
    width: 66
  }
});

CategoryPopup.propTypes = {
  close: func.isRequired,
  name: string.isRequired,
  description: string.isRequired,
  image: string.isRequired,
  words: arrayOf(string).isRequired,
  play: func.isRequired,
  transitionPosition: shape({
    x: number,
    y: number
  }).isRequired,
  imageID: number
};

CategoryPopup.defaultProps = {
  imageID: Math.random()
};

export default CategoryPopup;
