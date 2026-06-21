import { Group, List, Stack, Table, Text, ThemeIcon } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

const enterpriseFeatures = [
  "AI Integration (Chat, Search & Assistant)",
  "MCP Support",
  "SSO (SAML, OIDC, LDAP)",
  "SCIM Provisioning",
  "Multi-factor Authentication (2FA)",
  "Page-level Permissions",
  "Page Verification & Approval Workflow",
  "Audit Logs",
  "Enterprise Controls",
  "API Keys",
  "Advanced Search Engine Support",
  "Full-text Search in Attachments (PDF, DOCX)",
  "Resolve Comments",
  "Confluence Import",
  "PDF & DOCX Import",
  "Templates",
  "Personal Spaces"
];

export default function OssDetails() {
  return (
    <Stack gap="lg">
      <Table.ScrollContainer minWidth={500} py="md">
        <Table
          variant="vertical"
          verticalSpacing="sm"
          layout="fixed"
          withTableBorder
        >
          <Table.Tbody>
            <Table.Tr>
              <Table.Th w={160}>Edition</Table.Th>
              <Table.Td>
                <Group wrap="nowrap">
                  Open Source
                  <div>
                    <ThemeIcon
                      color="green"
                      variant="light"
                      size={24}
                      radius="xl"
                    >
                      <IconCheck size={16} />
                    </ThemeIcon>
                  </div>
                </Group>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Stack gap="md">
        <Text fw={500}>Upgrade to the Enterprise Edition to unlock:</Text>

        <List
          spacing={4}
          size="sm"
          icon={
            <ThemeIcon size={20} color={"gray"} radius="xl">
              <IconCheck size={14} />
            </ThemeIcon>
          }
        >
          {enterpriseFeatures.map((feature) => (
            <List.Item key={feature}>{feature}</List.Item>
          ))}
        </List>

        <Text size="sm" c="dimmed">
          Get an enterprise trial key at{" "}
          <a
            href="https://likh.app/customers/"
            target="_blank"
            rel="noopener noreferrer"
          >
            likh.app/customers
          </a>
          .
        </Text>

        <Text size="sm" c="dimmed">
          Visit{" "}
          <a
            href="https://likh.app/pricing"
            target="_blank"
            rel="noopener noreferrer"
          >
            likh.app/pricing
          </a>{" "}
          to purchase an enterprise license.
        </Text>
        <Text size="sm" c="dimmed">
          For inquiries, contact{" "}
          <a href="mailto:sales@likh.app">sales@likh.app</a>
        </Text>
      </Stack>
    </Stack>
  );
}
