import { readAsStringAsync, EncodingType, deleteAsync } from 'expo-file-system';
import { AsyncStorage } from 'react-native';

import client from '../apolloStore';
import callApi, { uploadFile, uploadChunk } from '../helpers/apiCaller';
import { toggleProgressBadge } from './popup';

import UPDATE_MATCH from '../graphql/mutations/updateMatch';
import UPDATE_USER from '../graphql/mutations/updateUser';

export const UPDATE_PROGRESS = 'UPDATE_PROGRESS';
export const ADD_VIDEO_TO_QUEUE = 'ADD_VIDEO_TO_QUEUE';
export const FINISH_VIDEO_UPLOAD = 'FINISH_VIDEO_UPLOAD';
export const FINISH_PIC_UPLOAD = 'FINISH_PIC_UPLOAD';
export const UPDATE_PIC_PROGRESS = 'UPDATE_PIC_PROGRESS';
export const START_PIC_UPLOAD = 'START_PIC_UPLOAD';
export const COMPLETE_VIDEO = 'COMPLETE_VIDEO';

export const updateProgress = (name, progress, uploadedBytes) => ({
  name,
  progress,
  uploadedBytes,
  type: UPDATE_PROGRESS
});

const addVideoToQueue = file => ({
  file,
  type: ADD_VIDEO_TO_QUEUE
});

const updatePicProgress = progress => ({
  progress,
  type: UPDATE_PIC_PROGRESS
});

const startPicUpload = () => ({
  type: START_PIC_UPLOAD
});

const completeVideo = count => ({
  count,
  type: COMPLETE_VIDEO
});

const finishVideoUpload = () => ({
  type: FINISH_VIDEO_UPLOAD
});

const finishPicUpload = () => ({
  type: FINISH_PIC_UPLOAD
});

const getSignedRequest = async ({ name, type }, folder, isStatic = false) => {
  try {
    const response = await callApi(
      `s3/sign?file-name=${name}&file-type=${type}&folder-name=${folder}${
        isStatic ? '&static=true' : ''
      }`
    );
    return await response.json();
  } catch (exception) {
    console.log(exception.message);
  }
};

const uploadVideoComplete = ({ matchID, opponentID, s3Url }) => async (
  dispatch,
  getState
) => {
  const {
    file: { videos, completedCount }
  } = getState();
  const updateProperties = {
    state: 'answer',
    video: s3Url,
    turn: opponentID
  };
  const properties = JSON.stringify(updateProperties);

  await client.mutate({
    mutation: UPDATE_MATCH,
    variables: { matchID, properties }
  });

  if (completedCount + 1 === Object.keys(videos).length)
    dispatch(finishVideoUpload());
  else dispatch(completeVideo(completedCount + 1));
};

const uploadPicComplete = ({ userID, s3Url }, onFinish) => async dispatch => {
  const newID = Math.random();
  const properties = JSON.stringify({ profilePic: `${s3Url}?rand=${newID}` });
  await client.mutate({
    mutation: UPDATE_USER,
    variables: { id: userID, properties }
  });

  if (onFinish) onFinish();

  dispatch(finishPicUpload());
};

export const upload = file => async dispatch => {
  const { matchID, actedWord, cameraType } = file;
  const folder = 'Videos';

  client.mutate({
    mutation: UPDATE_MATCH,
    variables: {
      matchID,
      properties: JSON.stringify({ state: 'sending', actedWord, cameraType })
    }
  });

  dispatch(toggleProgressBadge(true));

  const { signedRequest, url: s3Url } = await getSignedRequest(file, folder);

  const handleProgress = (name, progress, uploadedBytes) =>
    dispatch(updateProgress(name, progress, uploadedBytes));

  const handleFinish = doneFile => {
    dispatch(uploadVideoComplete(doneFile));
    deleteAsync(doneFile.uri, { idempotent: true });
    AsyncStorage.removeItem('brokenUploadData');
  };

  const composeFile = { ...file, s3Url, progress: 0, uploadedBytes: 0 };

  dispatch(addVideoToQueue(composeFile));
  uploadFile(composeFile, signedRequest, handleProgress, handleFinish);
};

export const uploadPic = (file, onFinish = null) => async dispatch => {
  const folder = 'ProfilePics';

  const { signedRequest, url: s3Url } = await getSignedRequest(
    file,
    folder,
    true
  );

  const handleProgress = (_, progress) => dispatch(updatePicProgress(progress));

  const handleFinish = doneFile =>
    dispatch(uploadPicComplete(doneFile, onFinish));

  const composeFile = { ...file, s3Url };

  dispatch(startPicUpload());
  uploadFile(composeFile, signedRequest, handleProgress, handleFinish);
};

export const uploadFileChunk = fileData => async dispatch => {
  const file = await readAsStringAsync(fileData.uri, {
    encoding: EncodingType.Base64
  });

  const { signedRequest, url: s3Url } = await getSignedRequest(
    fileData,
    'Videos'
  );

  const handleProgress = (name, progress, uploadedBytes) =>
    dispatch(updateProgress(name, progress, uploadedBytes));

  const handleFinish = doneFile => dispatch(uploadVideoComplete(doneFile));

  const composeFile = { ...fileData, s3Url, progress: 0, uploadedBytes: 0 };

  dispatch(addVideoToQueue(composeFile));
  uploadChunk(
    file,
    composeFile,
    signedRequest,
    handleProgress,
    handleFinish,
    fileData.uploadedBytes
  );
};
