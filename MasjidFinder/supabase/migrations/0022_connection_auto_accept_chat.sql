-- Ensure reverse connection requests create the same chat as a normal accept.
create unique index if not exists uq_conversations_connection on conversations (connection_id)
  where connection_id is not null;

create or replace function fn_request_connection(p_requester uuid, p_recipient uuid)
returns connections as $$
declare
  v_existing connections;
  v_result connections;
  v_conversation_id uuid;
begin
  if p_requester = p_recipient then raise exception 'Cannot connect to yourself'; end if;
  if exists (select 1 from blocks where blocker_id = p_recipient and blocked_id = p_requester) then
    raise exception 'This user is not accepting connection requests';
  end if;

  select * into v_existing from connections
    where least(requester_id, recipient_id) = least(p_requester, p_recipient)
      and greatest(requester_id, recipient_id) = greatest(p_requester, p_recipient);

  if v_existing.id is not null then
    if v_existing.status in ('declined', 'cancelled') then
      update connections set requester_id = p_requester, recipient_id = p_recipient, status = 'pending', responded_at = null, created_at = now()
        where id = v_existing.id returning * into v_result;
      return v_result;
    elsif v_existing.status = 'pending' and v_existing.requester_id = p_recipient then
      update connections set status = 'accepted', responded_at = now() where id = v_existing.id returning * into v_result;
      insert into conversations (connection_id)
        values (v_existing.id)
        on conflict (connection_id) do nothing
        returning id into v_conversation_id;
      if v_conversation_id is not null then
        insert into conversation_participants (conversation_id, profile_id)
          values (v_conversation_id, p_requester), (v_conversation_id, p_recipient)
          on conflict do nothing;
      end if;
      return v_result;
    else
      return v_existing;
    end if;
  end if;

  insert into connections (requester_id, recipient_id, status)
    values (p_requester, p_recipient, 'pending') returning * into v_result;
  return v_result;
end;
$$ language plpgsql security definer set search_path = public;