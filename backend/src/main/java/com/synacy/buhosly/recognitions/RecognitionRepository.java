package com.synacy.buhosly.recognitions;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecognitionRepository extends JpaRepository<Recognition, UUID> {

    Page<Recognition> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
