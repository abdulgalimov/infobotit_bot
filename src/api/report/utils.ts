export function normalizePhone(userPhone: string) {
  const phoneReg = /^(\+7|8|7)(?<num>\d+)$/;
  const exec = phoneReg.exec(userPhone);
  if (exec) {
    const { num } = exec.groups;
    return num;
  } else {
    return userPhone;
  }
}

const orgTitleReg = /(?<title>[^_]+)(_(\d+))?/;
export function extractOrgTitle(orgSourceName) {
  if (!orgSourceName) return orgSourceName;

  orgTitleReg.lastIndex = 0;
  const exec = orgTitleReg.exec(orgSourceName);
  const { title } = exec.groups;
  return title;
}

export function timeout(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

export function getOrgTitleFromNewCdrEvent(body) {
  const { type, dsttrcunkname, srctrunkname } = body;
  switch (type) {
    case 'Inbound':
      return extractOrgTitle(srctrunkname);
    case 'Outbound':
      return extractOrgTitle(dsttrcunkname);
  }
}

export function getOrgTitleFromCallStatusEvent(body) {
  if (!body.members?.length) {
    return;
  }

  const member = body.members.find(
    (member) => member['inbound'] || member['outbound'],
  );
  if (!member) {
    return;
  }

  const customerInfo = member['inbound'] || member['outbound'];

  return extractOrgTitle(customerInfo?.trunkname);
}
