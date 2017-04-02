import React, { Component, PropTypes } from 'react';
import LeaderboardAvatar from '../LeaderboardAvatar/LeaderboardAvatar';
import ChallengeProgressBar from '../ChallengeProgressBar/ChallengeProgressBar';
import ProgressBarTooltip from '../ChallengeCard/Tooltips/ProgressBarTooltip';
import RegistrantsIcon from '../Icons/RegistrantsIcon';
import SubmissionsIcon from '../Icons/SubmissionsIcon';
import Tooltip from '../ChallengeCard/Tooltips/Tooltip';
import UserAvatarTooltip from '../ChallengeCard/Tooltips/UserAvatarTooltip';
import ForumIcon from '../Icons/ForumIcon';
import moment from 'moment';
import _ from 'lodash';
import './ChallengeStatus.scss';

// Constants
const MM_LONGCONTEST = 'https://community.topcoder.com/longcontest/?module';
const MM_REG = `${MM_LONGCONTEST}=ViewRegistrants&rd=`;
const MM_SUB = `${MM_LONGCONTEST}=ViewStandings&rd=`;
const ID_LENGTH = 6;

// Mock winners array
let MOCK_WINNERS = [
  {
    handle: 'tc1',
    position: 1
  },
  {
    handle: 'tc2',
    position: 2,
    photoURL: 'https://acrobatusers.com/assets/images/template/author_generic.jpg'
  },
  {
    handle: 'tc3',
    position: 3
  },
  {
    handle: 'tc4',
    position: 4
  }
]
const MAX_VISIBLE_WINNERS = 3
const FORUM_URL = 'https://apps.topcoder.com/forums/?module=Category&categoryID='
const CHALLENGE_URL = 'https://www.topcoder.com/challenge-details/'
const DEV_CHALLENGE_DETAILS_API = 'https://api.topcoder.com/v2/develop/challenges/'
const DES_CHALLENGE_DETAILS_API = 'https://api.topcoder.com/v2/design/challenges/result/'
const DS_CHALLENGE_DETAILS_API = ''
const MOCK_PHOTO = 'https://acrobatusers.com/assets/images/template/author_generic.jpg'
const STALLED_MSG = 'Stalled'
const STALLED_TIME_LEFT_MSG = 'Challenge is currently on hold'
const FF_TIME_LEFT_MSG = 'Winner is working on fixes'

const getTimeLeft = (date, currentPhase) => {
  if (!currentPhase || currentPhase === 'Stalled') {
    return {
      late: false,
      text: STALLED_TIME_LEFT_MSG
    }
  } else if (currentPhase === 'Final Fix') {
    return {
      late: false,
      text: FF_TIME_LEFT_MSG
    }
  }
  const duration = moment.duration(moment(date).diff(moment()))
  const h = duration.hours()
  const d = duration.days()
  const m = duration.minutes()
  const late = (d < 0 || h < 0 || m < 0)
  const suffix = h != 0 ? 'h' : 'min'
  let text = ''
  if (d != 0) text += `${Math.abs(d)}d `
  if (h != 0) text += `${Math.abs(h)}`
  if (h != 0 && m != 0) text += ':'
  if (m != 0) text += `${Math.abs(m)}`
  text += suffix
  if (late) {
    text = `Late by ${text}`
  } else {
    text = `${text} to go`
  }
  return {
    late,
    text
  }
}

function numRegistrantsTipText(number) {
  switch (number) {
    case 0: return 'No registrants';
    case 1: return '1 total registrant';
    default: return `${number} total registrants`;
  }
}

function numSubmissionsTipText(number) {
  switch (number) {
    case 0: return 'No submissions';
    case 1: return '1 total submission';
    default: return `${number} total submissions`;
  }
}
const registrantsLink = (challenge, type) => {
  if(challenge.track === 'DATA_SCIENCE') {
    const id = challenge.challengeId + '';
    if(id.length < ID_LENGTH) {
      return `${type}${challenge.challengeId}`;
    } else {
      return `${CHALLENGE_URL}${challenge.challengeId}/?type=develop#viewRegistrant`;
    }
  } else {
    return `${CHALLENGE_URL}${challenge.challengeId}/?type=${challenge.track.toLowerCase()}#viewRegistrant`;
  }
}

const getStatusPhase = ( challenge ) => {
  switch (challenge.currentPhaseName) {
    case 'Registration':
      return {
        currentPhaseName: 'Submission',
        currentPhaseEndDate: challenge.submissionEndDate
      }
    default:
      return {
        currentPhaseName: challenge.currentPhaseName,
        currentPhaseEndDate: challenge.currentPhaseEndDate
      }
  }
}

const getTimeToGo = (start, end) => {
  const percentageComplete = (moment() - moment(start)) / (moment(end) - moment(start)) * 100
  return (Math.round(percentageComplete * 100) / 100)
}

function getDevelopmentWinners(challengeId) {
  return new Promise((resolve, reject) => {
    fetch(`${DEV_CHALLENGE_DETAILS_API}${challengeId}`)
      .then(res => res.json())
      .then(data => {
        const winners = data.submissions.filter(submission => submission.placement < 4)
          .map(winner => ({
            handle: winner.handle,
            position: winner.placement,
            photoURL: MOCK_PHOTO
          }));
        const uniqeWinners = _.uniqWith(winners, _.isEqual);
        resolve(uniqeWinners);
      })
      .catch(err => reject(err));
  });
}

function getDesignWinners(challengeId) {
  return new Promise((resolve, reject) => {
    fetch(`${DES_CHALLENGE_DETAILS_API}${challengeId}`)
      .then(res => res.json())
      .then(data => {
        const winners = data.results.filter(submission => submission.placement <=3)
        .map(winner => ({
          handle: winner.handle,
          position: winner.placement,
          photoURL: MOCK_PHOTO
        }));
        resolve(winners);
      })
      .catch(err => reject(err));
  });
}

/**
 * TODO
 * Return a list of winners given the challenge ID for a
 * Data Science challenge.
 * @param {String} challengeId 
 */
function getDataScienceWinners(challengeId) {

}

/**
 * Returns an user profile object as expected by the UserAvatarTooltip
 * @param {String} handle 
 */
function getSampleProfile(user) {
  const { handle } = user;
  return {
    handle,
    country: '',
    memberSince: '',
    photoLink: `i/m/${handle}.jpeg`,
    ratingSummary: [],
  }
}


class ChallengeStatus extends Component {
  constructor(props) {
    super(props);
    const {challenge, config, sampleWinnerProfile} = props;
    const lastItem = {
      handle: `+${MOCK_WINNERS.length - MAX_VISIBLE_WINNERS}`
    }
    MOCK_WINNERS = MOCK_WINNERS.slice(0, MAX_VISIBLE_WINNERS);
    MOCK_WINNERS.push(lastItem);
    this.state = {
      winners: ''
    };
    this.handleHover = this.handleHover.bind(this);
  } 

  renderLeaderboard() {
    const { challenge, sampleWinnerProfile } = this.props;
    const leaderboard = this.state.winners && this.state.winners.map((winner) => {

      return (
        <div className="avatar-container" key={winner.handle}>
          <UserAvatarTooltip user={getSampleProfile(winner)}>
            <LeaderboardAvatar member={winner} />
          </UserAvatarTooltip>
        </div>
      )
    });
    return leaderboard || (
    <span className="winners" onMouseEnter={this.handleHover}>
      <a href={`${CHALLENGE_URL}${challenge.challengeId}/#winner`}>Winners</a>
    </span>);
  }

  renderRegisterButton(challenge) {
    const lng = getTimeLeft(challenge.registrationEndDate || challenge.submissionEndDate, challenge.currentPhaseName).text.length
    return (
      <a href="#" className="register-button">
        <span>{getTimeLeft(challenge.registrationEndDate || challenge.submissionEndDate, challenge.currentPhaseName).text.substring(0, lng-6)}</span>
        <span className="to-register">to register</span>
      </a>
    )
  }

  activeChallenge() {
    const { challenge, config } = this.props;
    return (
      <div className={challenge.registrationOpen === 'Yes' ? 'challenge-progress with-register-button' : 'challenge-progress'}>
        <span className="current-phase">{challenge.currentPhaseName ? getStatusPhase(challenge).currentPhaseName : STALLED_MSG}</span>
        <span className="challenge-stats">
          <span>
            <Tooltip content={numRegistrantsTipText(challenge.numRegistrants)} className="num-reg-tooltip">
              <a className="num-reg" href={registrantsLink(challenge, MM_REG)}>
                <RegistrantsIcon className="challenge-stats-icon" /> <span className="number">{challenge.numRegistrants}</span>
              </a>
            </Tooltip>
          </span>
          <span>
            <Tooltip content={numSubmissionsTipText(challenge.numSubmissions)}>
              <a className="num-sub" href={registrantsLink(challenge, MM_SUB)}>
                <SubmissionsIcon/> <span className="number">{challenge.numSubmissions}</span>
              </a>
            </Tooltip>
          </span>
          {
            challenge.myChallenge &&
            <span>
              <a className="link-forum" href={`${FORUM_URL}${challenge.forumId}`}>
                <ForumIcon/>
              </a>
            </span>
          }
        </span>
        <ProgressBarTooltip challenge={challenge} config={config}>
          {
            challenge.status === 'Active' ?
            <div>
              <ChallengeProgressBar color="green"
                value={getTimeToGo(challenge.registrationStartDate, getStatusPhase(challenge).currentPhaseEndDate)}
                isLate={getTimeLeft(getStatusPhase(challenge).currentPhaseEndDate, getStatusPhase(challenge).currentPhaseName).late}
              />
            <div className="time-left">{getTimeLeft(getStatusPhase(challenge).currentPhaseEndDate, getStatusPhase(challenge).currentPhaseName).text}</div>
            </div>
              :
            <ChallengeProgressBar color="gray" value="100"/>
          }
        </ProgressBarTooltip>
        {challenge.registrationOpen === 'Yes' && this.renderRegisterButton(challenge)}
      </div>
    )
  }

  completedChallenge() {
    const { challenge } = this.props;
    return (
      <div>
        {this.renderLeaderboard()}
        <span className="challenge-stats">
          <span>
            <Tooltip content={numRegistrantsTipText(challenge.numRegistrants)}>
              <a className="num-reg past" href={`${CHALLENGE_URL}${challenge.challengeId}/?type=${challenge.track.toLowerCase()}#viewRegistrant`}>
                <RegistrantsIcon/> <span className="number">{challenge.numRegistrants}</span>
              </a>
            </Tooltip>
          </span>
          <span>
            <Tooltip content={numSubmissionsTipText(challenge.numSubmissions)}>
              <a className="num-sub past" href={`${CHALLENGE_URL}${challenge.challengeId}/?type=${challenge.track.toLowerCase()}#viewRegistrant`}>
                <SubmissionsIcon/> <span className="number">{challenge.numSubmissions}</span>
              </a>
            </Tooltip>
          </span>
          {
            challenge.myChallenge &&
            <span>
              <a className="link-forum past" href={`${FORUM_URL}${challenge.forumId}`}><ForumIcon/></a>
            </span>
          }
        </span>
      </div>
    )
  }

  getWinners(challengeType, challengeId) {
    switch (challengeType) {
      case 'develop':
        return getDevelopmentWinners(challengeId);
      case 'data':
        return getDataScienceWinners(challengeId);
      case 'design':
        return getDesignWinners(challengeId);
    }
    return getDevelopmentWinners(challengeId);
  }

    /**
   * Get the list of winners when the user hovers
   * over the status
   */
  handleHover() {
    if (!this.state.winners) {
      const { challenge } = this.props;
      const { challengeId, challengeCommunity } = challenge;

      // We don't have the API for data science challenge
      if (challengeCommunity.toLowerCase() === 'data') {
        return;
      }
      const results = this.getWinners(challengeCommunity.toLowerCase(), challengeId);
      results.then(winners => this.setState({ winners }));
    }
  }

  render() {
  const { challenge } = this.props;
  const status = challenge.status === 'Completed' ? "completed" : "";
  return (
    <div className={"challenge-status "+status}>
      {challenge.status === 'Completed' ? this.completedChallenge() : this.activeChallenge()}
    </div>
    )
  }

}

export default ChallengeStatus;
