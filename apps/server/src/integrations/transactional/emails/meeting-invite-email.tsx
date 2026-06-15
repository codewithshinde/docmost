import { Section, Text } from 'react-email';
import * as React from 'react';
import { content, paragraph } from '../css/styles';
import { EmailButton, MailBody } from '../partials/partials';

interface Props {
  actorName: string;
  actionText: string;
  eventTitle: string;
  whenLabel: string;
  location?: string;
  meetingUrl?: string;
  calendarUrl: string;
}

export const MeetingInviteEmail = ({
  actorName,
  actionText,
  eventTitle,
  whenLabel,
  location,
  meetingUrl,
  calendarUrl,
}: Props) => {
  return (
    <MailBody>
      <Section style={content}>
        <Text style={paragraph}>Hi there,</Text>
        <Text style={paragraph}>
          <strong>{actorName}</strong> {actionText}{' '}
          <strong>{eventTitle}</strong>.
        </Text>
        <Text style={paragraph}>{whenLabel}</Text>
        {location && <Text style={paragraph}>Location: {location}</Text>}
        {meetingUrl && (
          <Text style={paragraph}>
            Meeting link:{' '}
            <a href={meetingUrl} target="_blank" rel="noreferrer">
              {meetingUrl}
            </a>
          </Text>
        )}
      </Section>
      <EmailButton href={calendarUrl}>View in Calendar</EmailButton>
    </MailBody>
  );
};

export default MeetingInviteEmail;
