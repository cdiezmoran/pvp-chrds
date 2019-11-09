import React from 'react';
import { StyleSheet, View } from 'react-native';
import { number } from 'prop-types';

import MedalIcon from '../../assets/icons/ribbon.svg';

const LevelProgressBar = ({ progress }) => (
  <View style={styles.container}>
    <View style={styles.wrapper}>
      <View style={[styles.progress, { width: `${progress}%` }]} />
    </View>
    <MedalIcon width={24} height={24} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  wrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    height: 3,
    maxHeight: 3,
    width: '90%'
  },
  progress: {
    backgroundColor: '#7C4DFF',
    borderRadius: 2,
    height: 3
  }
});

LevelProgressBar.propTypes = {
  progress: number
};

LevelProgressBar.defaultProps = {
  progress: 0
};

export default LevelProgressBar;
