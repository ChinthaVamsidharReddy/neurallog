package com.llmplatform.service;

import com.llmplatform.entity.Conversation;
import com.llmplatform.entity.Message;
import com.llmplatform.repository.ConversationRepository;
import com.llmplatform.repository.MessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepo;
    private final MessageRepository messageRepo;

    public ConversationService(ConversationRepository conversationRepo,
                               MessageRepository messageRepo) {
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
    }

    public List<Conversation> listAll() {
        return conversationRepo.findAllByOrderByUpdatedAtDesc();
    }

    public Optional<Conversation> findById(String id) {
        return conversationRepo.findById(id);
    }

    public Conversation create(Conversation conversation) {
        return conversationRepo.save(conversation);
    }

    public Optional<Conversation> update(String id, String title) {
        return conversationRepo.findById(id).map(c -> {
            c.setTitle(title);
            return conversationRepo.save(c);
        });
    }

    @Transactional
    public void delete(String id) {
        messageRepo.deleteByConversationId(id);
        conversationRepo.deleteById(id);
    }

    public List<Message> getMessages(String conversationId) {
        return messageRepo.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }
}