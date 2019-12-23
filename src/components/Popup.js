import React, { useState, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { arrayOf, bool, func, object, oneOfType, node } from 'prop-types';

import { useAnimation } from '../helpers/hooks';
import Layout from '../constants/Layout';

const Popup = ({
  children,
  close,
  showsDragIndicator,
  animationOptions,
  onContentLayout,
  contentStyles
}) => {
  const [contentHeight, setContentHeight] = useState(180);
  const [animateDisplay, setAnimateDisplay] = useState({});
  const { animationValue, animateTo } = useAnimation({
    autoPlay: true,
    ...animationOptions
  });
  const position = useRef(new Animated.ValueXY());

  const animateOpacity = {
    opacity: animationValue.current.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1]
    })
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (event, gesture) => {
      if (gesture.dy <= 0) return;
      position.current.setValue({ x: 0, y: gesture.dy });
    },
    onPanResponderRelease: (event, gesture) => {
      const threshold = contentHeight * 0.65;
      const checkAgainst = contentHeight - gesture.dy;
      if (threshold > checkAgainst) {
        position.current.setValue({ x: 0, y: contentHeight });
        handleClose();
      } else position.current.setValue({ x: 0, y: 0 });
    }
  });

  const handleClose = () => {
    animateTo(0);
    setTimeout(() => close(), 200);
  };

  const handleLayout = event => {
    const {
      nativeEvent: {
        layout: { height }
      }
    } = event;

    if (onContentLayout) onContentLayout(event);

    const transform = [
      {
        translateY: animationValue.current.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -height]
        })
      }
    ];

    setAnimateDisplay({ transform });
    setContentHeight(height);
  };

  return (
    <View style={styles.popup}>
      <Animated.View style={[styles.overlay, animateOpacity]}>
        <TouchableOpacity style={styles.closeOverlay} onPress={handleClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.content,
          {
            transform:
              position.current && animateDisplay.transform
                ? [
                    ...animateDisplay.transform,
                    ...position.current.getTranslateTransform()
                  ]
                : []
          },
          Platform.OS === 'ios' ? styles.posApple : styles.posAndroid,
          contentStyles
        ]}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        {showsDragIndicator ? <View style={styles.slideIndicator} /> : null}
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  popup: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 5
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: -1
  },
  closeOverlay: {
    height: '100%',
    width: '100%'
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    left: 0,
    minHeight: 180,
    position: 'absolute',
    right: 0,
    top: Layout.window.height
  },
  slideIndicator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 2,
    height: 4,
    position: 'absolute',
    top: 12,
    width: 60
  }
});

Popup.propTypes = {
  children: oneOfType([arrayOf(node), node]),
  close: func.isRequired,
  showsDragIndicator: bool,
  animationOptions: object,
  onContentLayout: func,
  contentStyles: object
};

Popup.defaultProps = {
  children: null,
  showsDragIndicator: true,
  animationOptions: {},
  onContentLayout: null,
  contentStyles: null
};

export default Popup;
