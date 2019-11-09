import React from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  View
} from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';
import { FontAwesome5 } from '@expo/vector-icons';
// import moment from 'moment';

import AnimatedCircle from '../components/AnimatedCircle';
import ProgressBar from '../components/LevelProgressBar';
// import MatchRow from '../components/MatchRow';

const HomeScreen = () => {
  return (
    <ScrollView>
      <View style={styles.container}>
        {Platform !== 'ios' ? <View style={styles.statusBar} /> : null}
        <View style={styles.header}>
          <AnimatedCircle
            color="#7C4DFF"
            size={152}
            animationType="position-opacity"
            endPosition={{ y: 152 - 152 / 4, x: -152 + 152 / 3 }}
            circleStyle={{ right: -152, top: -152 }}
          />
          <AnimatedCircle
            color="#FFC107"
            size={115}
            animationType="position-opacity"
            delay={150}
            endPosition={{ y: 115 - 115 / 3.5, x: 0 }}
            circleStyle={{ top: -115, right: 42 }}
          />
          <AnimatedCircle
            color="#FF5252"
            size={90}
            animationType="position-opacity"
            delay={300}
            endPosition={{ y: 90 - 90 / 1.8, x: 0 }}
            circleStyle={{ top: -90, left: 42 }}
            empty
          />
          <View style={styles.leftSide}>
            <Text style={styles.greeting}>Hello Pam,</Text>
            <Text style={styles.subtitle}>Ready to Play?</Text>
          </View>
          <View style={styles.rightSide}>
            <TouchableOpacity style={styles.imgButton}>
              <Image
                resizeMode="cover"
                source={{ uri: 'https://thispersondoesnotexist.com/image' }}
                style={styles.profilePic}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.info}>
          <View style={styles.levelSection}>
            <Text style={styles.lvlTxtWrapper}>
              Lvl <Text style={styles.lvlTxt}>24</Text>
            </Text>
            <ProgressBar progress={90} />
            <Text style={styles.progressTxt}>10 until next level</Text>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.moneySection}>
            <View style={styles.coinWrapper}>
              <FontAwesome5 name="coins" size={30} color="#FFC107" />
              <Text style={styles.coins}>
                10,000 <Text style={styles.coinWord}>coins</Text>
              </Text>
            </View>
            <TouchableOpacity style={styles.getMore}>
              <Text style={styles.getMoreText}>Get More</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.lists}>
          {/* render lists when data is available */}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: getStatusBarHeight(),
    paddingBottom: 24
  },
  statusBar: {
    backgroundColor: '#fff',
    height: getStatusBarHeight(),
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 5
  },
  header: {
    flexDirection: 'row'
  },
  leftSide: {
    flexBasis: '80%',
    flexDirection: 'column',
    paddingLeft: 24,
    paddingTop: 36
  },
  rightSide: {
    alignItems: 'flex-end',
    flexBasis: '20%',
    paddingRight: 24,
    paddingTop: 36
  },
  greeting: {
    fontFamily: 'sf-bold',
    fontSize: 30,
    fontWeight: 'bold'
  },
  subtitle: {
    fontFamily: 'sf-thin',
    fontSize: 18,
    fontWeight: '100'
  },
  imgButton: {
    height: 42,
    width: 42
  },
  profilePic: {
    borderRadius: 42 / 2,
    height: 42,
    width: 42
  },
  info: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 24,
    paddingLeft: 24,
    paddingRight: 24
  },
  levelSection: {
    flexBasis: '50%'
  },
  verticalDivider: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    height: '100%',
    marginHorizontal: 12,
    width: 1
  },
  moneySection: {
    alignItems: 'center',
    flexBasis: '50%'
  },
  progressTxt: {
    fontFamily: 'sf-medium',
    textAlign: 'center'
  },
  lvlTxtWrapper: {
    fontFamily: 'sf-regular',
    fontSize: 16
  },
  lvlTxt: {
    fontSize: 24
  },
  coinWrapper: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  coins: {
    fontFamily: 'sf-bold',
    fontSize: 18,
    marginLeft: 12
  },
  coinWord: {
    fontSize: 8,
    fontFamily: 'sf-light'
  },
  getMore: {
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#7C4DFF',
    justifyContent: 'center',
    paddingVertical: 3,
    marginTop: 6,
    width: '80%'
  },
  getMoreText: {
    fontFamily: 'sf-medium',
    color: '#fff'
  },
  lists: {
    paddingHorizontal: 24
  },
  title: {
    fontFamily: 'sf-medium',
    fontSize: 30,
    marginTop: 24,
    opacity: 0.6
  },
  divider: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    height: 1,
    marginTop: 12,
    width: '100%'
  }
});

export default HomeScreen;
