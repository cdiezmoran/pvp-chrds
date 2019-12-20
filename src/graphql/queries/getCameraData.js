import gql from 'graphql-tag';

export default gql`
  query CameraScreenData(
    $categoryID: String!
    $opponentID: String!
    $matchID: String!
    $userID: String!
  ) {
    category(_id: $categoryID) {
      _id
      image
      color
      words {
        _id
        text
        hint
      }
    }
    opponent: userByID(_id: $opponentID) {
      _id
      profilePic
      username
      displayName
    }
    user: userByID(_id: $userID) {
      _id
      coins
    }
    match(_id: $matchID) {
      _id
      score
      replayWord {
        _id
        text
        hint
      }
    }
  }
`;
