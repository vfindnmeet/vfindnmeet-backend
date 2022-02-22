(ch .. mainly) on page leave - set loading true

(ch) fix likes listing page?

(ch) http request on chat msg send?
(ch) separate chat messages per date
(ch) show hour:minutes of last message

on chat message receive:
  (ch) incr notifs count
  (ch) if chat is open - don't inc

on network partition (close WS)
  (ch) on reopen when on UserChat page - get new messages and sync
  (ch) on reopen when on Chats page - get not seen messages for chats

on match
  (ch) show match modal on liker
  if other user is online - show notif

on liked
  (ch) send liked user notif with new likes count

Browse screen (show nearby people)
  (ch) search from ES
  (ch) search params: 60km radius
  (ch) user options: show online users
  (ch) sort by: (x) recently active, latest joined

intro message modal
  (ch) fix message to not be repeated
  (ch) currently title is always '..to you'

show if is online
  (ch) chat page
  (ch) chats page
  (ch) browse page

show if is verified
  (ch) chat page
  (ch) chats page
  (ch) browse page
  (ch) likes page
  (ch) profile page
  (ch) profile info page

verification
  (ch) add button/status for verification on profile info page
  (x) verification modal - take selfie and submit for verification
  (ch) ?verify on new screen
  (ch) BE workflow

(ch) deactivate account

settings
  (ch) change gender
  (ch) change interested_in

handle app errors
  (ch) maybe on GET request - retry after few seconds
  maybe on POST request error - show error message
  on 401 status code - logout

  add BE logging integration with third party service
  ?maybe add FE logging integration

(ch) send push notifications (expo-notifications - managed workflow)
  https://levelup.gitconnected.com/react-native-adding-push-notifications-to-your-app-with-expo-8e4b659ddbfb
  (ch) research push notifications
    how they work https://www.airship.com/resources/explainer/push-notifications-explained/
    how to integrate them for Android (FCM - Firebase Cloud Messaging) & iOS (APNs - Apple Push Notification service)
    expo push notification: https://docs.expo.dev/push-notifications/overview/ https://docs.expo.dev/push-notifications/push-notifications-setup/ 
  https://stackoverflow.com/questions/15385168/how-to-send-a-push-notification

  (ch) sending:
    NOTE: not online - app is minimized and WS connection is innactive & doesn't ping location & last activity time
    (ch) on chat msg when not online
    (ch) on like when not online
    (ch) on match when not online

?sign in with Google ?(& Facebook)
  research what's the workflow on mobile apps (& React Navice \w expo)

feature suggetion modal (on header top right maybe?)

add Bulgarian translation
add app logo
add app name

research expo subscription & payment
  should mobile apps use Google Pay & Apple Pay or can integrate Stripe?

  https://rafael-padovani.medium.com/stripe-payments-with-sca-in-react-native-15a4926e14f
  https://docs.expo.dev/versions/latest/sdk/in-app-purchases/
  https://github.com/naoufal/react-native-payments
  https://uplandsoftware.com/localytics/resources/blog/subscription-based-apps-pros-cons-and-how-to-make-the-big-bucks/

research Android & iOS appstore
  deployment workflow
  how to deploy React Native (\w Expo) app



TO FIX:
- (ch) on intro send (from Like from me page) - show message on like item
- (ch) app headers..n
- (ch) on chat open - currently sees all notifs and doesn't notify FE
- test load older chat messages
- add height picker to edit profile
- limit likes per day
- error on user image upload
- push notification message
- httpRetry set callback to stop on component unmount

- check how expo push notifications work when prod build on device

- quick video calls
  - new screen
  - wait till an online user is suggested to you
  - 




- on like/view - increment likes/views for the user for the hour
- on like/view - increment likes/views for the user for the hour redis
  - for sum(`<user_id-h<i>:dd>`.total_points)
  - on like/view calculate total points for the last 24h

- run cron to calculate stats for the last 24h
- 
- on like/view if user has above some total points


user_stats_last_day
  views
  likes
  total_points
  user_id
  gender

user_stats_hour
  views
  likes
  total_points
  user_id
  gender
  hour dd/mm/yyyy







calls
- user1 calls user2
- if user2 is offline - send push notification
- if user2 is is online
  - modal: incomming video call from `user1`. Accept or Decline.
    - on accept - init webrtc video chat
    - on decline - end call for both users
- user2 comes online (maybe seens push notif and clicks it)


http req - user1 calls user2
  - create `calls` entry with created_at = Date.now()
200 - { call.id, call.created_at }
500 - failed to call

user1 cancels call
  - http req - callId
    - UPDATE calls SET cancelled = TRUE WHERE id = callId
    - sendWsMessage(`user2_id`, {type: 'call-cancelled', { callId }})
  - if 201



user2 declines call
  - http req - callId
    - UPDATE calls SET declined = TRUE WHERE id = callId
    - sendWsMessage(`user1_id`, {type: 'call-declined', { callId }})
  - if 201

user2 accepts call
  - http req - callId
    - if !call.cancelled only
    - UPDATE calls SET accepted_at = Date.now() WHERE id = callId
    - sendWsMessage(`user1_id`, {type: 'call-accepted', { callId }})
  - if 201



user1 or user2 ends call
  - http req - callId
    - UPDATE calls SET ended_at = Date.now() WHERE id = callId
    - sendWsMessage(`user1_id`, {type: 'call-accepted', { callId }})
  - if 201




problems:
- user comes online - should see incomming call
  - lastCall = SELECT * FROM calls WHERE user_id = `current_user_id` ORDER BY created_at DESC LIMIT 1
  - if (lastCall && lastCall.created_at IS LESS THAN 60 SEC AGO)
    - incomming call
    - current_user_send({ call.id, call.from, call.createdAt })
- on server restart - end call
  - 
- on cancel and accept at the same time
  - 




calls
  id
  from_user_id
  to_user_id
  cancelled
  declined
  accepted_at
  ended_at
  created_at

